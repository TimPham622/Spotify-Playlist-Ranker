import { useEffect, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { BottomStatusStrip } from "./components/BottomStatusStrip";
import { MatchupView } from "./components/MatchupView";
import { PreSortPanel } from "./components/PreSortPanel";
import { ResultsView } from "./components/ResultsView";
import {
  getStoredSpotifyToken,
  handleSpotifyCallback,
  loginWithSpotify,
  logoutSpotify,
} from "./lib/spotifyAuth";
import { clearSortSession, loadSortSession, saveSortSession } from "./lib/sortPersistence";
import {
  applySortChoice,
  createSortSession,
  getModeLabel,
  getSortProgress,
  type SortChoice,
  type SortMode,
  type SortSession,
} from "./lib/sortingEngine";
import { fetchSpotifyPlaylistForSorting, type SpotifyPlaylistForSorting } from "./lib/spotifyPlaylist";

export default function App() {
  const [isAuthed, setIsAuthed] = useState(Boolean(getStoredSpotifyToken()));
  const [error, setError] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlist, setPlaylist] = useState<SpotifyPlaylistForSorting | null>(null);
  const [sortSession, setSortSession] = useState<SortSession | null>(() => loadSortSession());
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

  useEffect(() => {
    handleSpotifyCallback()
      .then((token) => setIsAuthed(Boolean(token ?? getStoredSpotifyToken())))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Spotify login failed.");
      });
  }, []);

  async function handlePlaylistSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPlaylist(null);
    setSortSession(null);
    clearSortSession();
    setIsLoadingPlaylist(true);

    try {
      setPlaylist(await fetchSpotifyPlaylistForSorting(playlistUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load that playlist.");
    } finally {
      setIsLoadingPlaylist(false);
    }
  }

  function handleStartSorting(
    selectedTracks: SpotifyPlaylistForSorting["tracks"],
    mode: SortMode,
    requestedSubsetSize: number | null,
  ) {
    if (!playlist) {
      return;
    }

    const nextSession = createSortSession(playlist, selectedTracks, mode, requestedSubsetSize);
    saveSortSession(nextSession);
    setSortSession(nextSession);
  }

  function handleChoice(choice: SortChoice) {
    setSortSession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      const nextSession = applySortChoice(currentSession, choice);
      saveSortSession(nextSession);
      return nextSession;
    });
  }

  function handleStartOver() {
    clearSortSession();
    setSortSession(null);
    setPlaylist(null);
    setPlaylistUrl("");
    setError(null);
  }

  function handleLogout() {
    logoutSpotify();
    clearSortSession();
    setIsAuthed(false);
    setPlaylist(null);
    setSortSession(null);
    setPlaylistUrl("");
  }

  const statusText = isAuthed ? "Spotify connected" : "Waiting for Spotify login";
  const progress = sortSession?.status === "sorting" ? getSortProgress(sortSession) : null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <h1 className="app-title">Spotify Playlist Ranker</h1>
          </div>

          <div className="app-header-actions">
            <span className="status-indicator" aria-label={statusText}>
              <span className="status-dot" aria-hidden="true" />
              Spotify: {isAuthed ? "Connected" : "Not connected"}
            </span>
            {isAuthed ? (
              <button className="console-button" onClick={handleLogout} type="button">
                <LogOut className="console-icon" aria-hidden="true" />
                Log out
              </button>
            ) : (
              <button className="console-button console-button-primary" onClick={() => void loginWithSpotify()} type="button">
                <LogIn className="console-icon console-icon-primary" aria-hidden="true" />
                Log in with Spotify
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="console-panel">
          <div className="console-panel-inner">
            <h2 className="console-section-title">Playlist setup</h2>
            <p className="console-text mt-1">
              Paste a Spotify playlist URL, then choose a ranking mode from the channel menu.
            </p>

            {error && <p className="message-panel message-panel-error mt-3">{error}</p>}

            {isAuthed ? (
              !sortSession && (
                <form className="playlist-form mt-4" onSubmit={handlePlaylistSubmit}>
                  <label>
                    <span className="console-label">Playlist URL</span>
                    <input
                      className="console-input"
                      onChange={(event) => setPlaylistUrl(event.target.value)}
                      placeholder="https://open.spotify.com/playlist/..."
                      type="text"
                      value={playlistUrl}
                    />
                  </label>
                  <button
                    className="console-button console-button-primary"
                    disabled={isLoadingPlaylist || !playlistUrl.trim()}
                    type="submit"
                  >
                    {isLoadingPlaylist ? "Loading..." : "Load playlist"}
                  </button>
                </form>
              )
            ) : (
              <div className="message-panel mt-4">
                Log in with Spotify to load playlists that your account is allowed to read.
              </div>
            )}
          </div>
        </section>

        {!sortSession && playlist && <PreSortPanel key={playlist.id} playlist={playlist} onStart={handleStartSorting} />}
        {sortSession?.status === "sorting" && (
          <MatchupView session={sortSession} onChoose={handleChoice} onStartOver={handleStartOver} />
        )}
        {sortSession?.status === "complete" && <ResultsView session={sortSession} onStartOver={handleStartOver} />}

        <div className="mt-4">
          <BottomStatusStrip
            status={sortSession?.status === "complete" ? "Ranking complete" : statusText}
            playlistName={sortSession?.playlist.name ?? playlist?.name}
            modeLabel={sortSession ? getModeLabel(sortSession) : undefined}
            matchupText={progress ? `${progress.currentMatchupNumber} of ~${progress.displayedEstimate}` : undefined}
            onStartOver={sortSession || playlist ? handleStartOver : undefined}
            onLogout={isAuthed ? handleLogout : undefined}
          />
        </div>
      </main>
    </div>
  );
}
