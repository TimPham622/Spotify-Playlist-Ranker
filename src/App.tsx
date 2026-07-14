import { useEffect, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
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
import { applySortChoice, createSortSession, type SortChoice, type SortMode, type SortSession } from "./lib/sortingEngine";
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

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto w-full max-w-4xl rounded-[2rem] border border-white/80 bg-white/55 p-8 text-center shadow-[0_24px_70px_rgba(54,128,171,0.22)] backdrop-blur-md">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700">Frutiger Aero Mix Lab</p>
        <h1 className="mt-3 text-4xl font-black text-sky-900">Spotify Bias Sorter</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sky-950/75">
          Paste a Spotify playlist, filter it down to sortable songs, then rank it head-to-head.
        </p>

        {error && <p className="mt-5 rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-800">{error}</p>}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isAuthed ? (
            <>
              <span className="rounded-full bg-emerald-100 px-5 py-3 text-sm font-black text-emerald-800 shadow-inner ring-1 ring-white/80">
                Spotify connected
              </span>
              <button
                className="inline-flex rounded-full bg-white px-6 py-3 font-bold text-sky-800 shadow-lg ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:shadow-xl"
                onClick={() => {
                  logoutSpotify();
                  clearSortSession();
                  setIsAuthed(false);
                  setPlaylist(null);
                  setSortSession(null);
                  setPlaylistUrl("");
                }}
              >
                <LogOut className="mr-2 h-5 w-5" aria-hidden="true" />
                Log out
              </button>
            </>
          ) : (
            <button
              className="inline-flex rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-7 py-3 font-black text-white shadow-lg shadow-sky-300/40 ring-1 ring-white/80 transition hover:-translate-y-0.5 hover:from-cyan-100 hover:to-sky-300 hover:shadow-xl"
              onClick={() => void loginWithSpotify()}
            >
              <LogIn className="mr-2 h-5 w-5" aria-hidden="true" />
              Log in with Spotify
            </button>
          )}
        </div>

        {isAuthed && !sortSession && (
          <form className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row" onSubmit={handlePlaylistSubmit}>
            <input
              className="min-h-12 flex-1 rounded-full border border-sky-100 bg-white/85 px-5 text-sky-950 shadow-inner outline-none transition placeholder:text-sky-900/35 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
              onChange={(event) => setPlaylistUrl(event.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              type="text"
              value={playlistUrl}
            />
            <button
              className="min-h-12 rounded-full bg-gradient-to-b from-lime-200 to-cyan-300 px-7 font-black text-sky-900 shadow-lg shadow-cyan-200/50 ring-1 ring-white/90 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoadingPlaylist || !playlistUrl.trim()}
              type="submit"
            >
              {isLoadingPlaylist ? "Loading..." : "Load playlist"}
            </button>
          </form>
        )}
      </section>

      {!sortSession && playlist && <PreSortPanel key={playlist.id} playlist={playlist} onStart={handleStartSorting} />}
      {sortSession?.status === "sorting" && (
        <MatchupView session={sortSession} onChoose={handleChoice} onStartOver={handleStartOver} />
      )}
      {sortSession?.status === "complete" && <ResultsView session={sortSession} onStartOver={handleStartOver} />}
    </main>
  );
}
