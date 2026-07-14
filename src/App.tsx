import { useEffect, useState } from "react";
import {
  getStoredSpotifyToken,
  handleSpotifyCallback,
  loginWithSpotify,
  logoutSpotify,
} from "./lib/spotifyAuth";

export default function App() {
  const [isAuthed, setIsAuthed] = useState(Boolean(getStoredSpotifyToken()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleSpotifyCallback()
      .then((token) => setIsAuthed(Boolean(token ?? getStoredSpotifyToken())))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Spotify login failed.");
      });
  }, []);

  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/80 bg-white/55 p-8 text-center shadow-[0_24px_70px_rgba(54,128,171,0.22)] backdrop-blur-md">
        <h1 className="mt-3 text-4xl font-black text-sky-900">Spotify Bias Sorter</h1>

        {error && <p className="mt-5 rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-800">{error}</p>}

        <div className="mt-8 flex justify-center gap-3">
          {isAuthed ? (
            <button
              className="rounded-full bg-white px-6 py-3 font-bold text-sky-800 shadow-lg ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:shadow-xl"
              onClick={() => {
                logoutSpotify();
                setIsAuthed(false);
              }}
            >
              Log out
            </button>
          ) : (
            <button
              className="rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-7 py-3 font-black text-white shadow-lg shadow-sky-300/40 ring-1 ring-white/80 transition hover:-translate-y-0.5 hover:from-cyan-100 hover:to-sky-300 hover:shadow-xl"
              onClick={() => void loginWithSpotify()}
            >
              Log in with Spotify
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
