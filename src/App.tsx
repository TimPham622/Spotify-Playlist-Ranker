import { useEffect, useState } from "react";
import {
  getStoredSpotifyToken,
  handleSpotifyCallback,
  loginWithSpotify,
  logoutSpotify,
} from "./lib/spotifyAuth";
import { fetchSpotifyPlaylistForSorting, type SpotifyPlaylistForSorting } from "./lib/spotifyPlaylist";

export default function App() {
  const [isAuthed, setIsAuthed] = useState(Boolean(getStoredSpotifyToken()));
  const [error, setError] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlist, setPlaylist] = useState<SpotifyPlaylistForSorting | null>(null);
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
    setIsLoadingPlaylist(true);

    try {
      setPlaylist(await fetchSpotifyPlaylistForSorting(playlistUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load that playlist.");
    } finally {
      setIsLoadingPlaylist(false);
    }
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
                className="rounded-full bg-white px-6 py-3 font-bold text-sky-800 shadow-lg ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:shadow-xl"
                onClick={() => {
                  logoutSpotify();
                  setIsAuthed(false);
                  setPlaylist(null);
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <button
              className="rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-7 py-3 font-black text-white shadow-lg shadow-sky-300/40 ring-1 ring-white/80 transition hover:-translate-y-0.5 hover:from-cyan-100 hover:to-sky-300 hover:shadow-xl"
              onClick={() => void loginWithSpotify()}
            >
              Log in with Spotify
            </button>
          )}
        </div>

        {isAuthed && (
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

      {playlist && (
        <section className="mx-auto mt-8 w-full max-w-4xl rounded-[2rem] border border-white/80 bg-white/65 p-5 shadow-[0_20px_60px_rgba(54,128,171,0.18)] backdrop-blur-md">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {playlist.imageUrl && (
              <img
                alt=""
                className="h-28 w-28 rounded-3xl object-cover shadow-lg ring-4 ring-white/90"
                src={playlist.imageUrl}
              />
            )}
            <div className="text-left">
              <p className="text-sm font-bold text-cyan-700">Ready for sorting</p>
              <h2 className="text-3xl font-black text-sky-950">{playlist.name}</h2>
              <p className="mt-1 text-sky-900/70">
                {playlist.tracks.length} valid songs from {playlist.ownerName}
                {playlist.filteredOutCount > 0 ? `, ${playlist.filteredOutCount} local or non-song items skipped` : ""}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {playlist.tracks.slice(0, 8).map((track) => (
              <article
                className="flex items-center gap-4 rounded-3xl border border-white/80 bg-white/70 p-3 text-left shadow-sm"
                key={track.id}
              >
                {track.albumArtUrl && (
                  <img alt="" className="h-14 w-14 rounded-2xl object-cover shadow-sm" src={track.albumArtUrl} />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-black text-sky-950">{track.title}</h3>
                  <p className="truncate text-sm text-sky-900/70">{track.artist}</p>
                </div>
                {!track.previewUrl && (
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                    No preview
                  </span>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
