import { RefreshCcw, Trophy } from "lucide-react";
import { getRankedTracks, type SortSession } from "../lib/sortingEngine";

type ResultsViewProps = {
  session: SortSession;
  onStartOver: () => void;
};

export function ResultsView({ session, onStartOver }: ResultsViewProps) {
  const rankedTracks = getRankedTracks(session);

  return (
    <section className="mx-auto mt-8 w-full max-w-5xl rounded-[2rem] border border-white/80 bg-white/65 p-6 shadow-[0_20px_60px_rgba(54,128,171,0.18)] backdrop-blur-md">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {session.playlist.imageUrl && (
            <img
              alt=""
              className="h-24 w-24 rounded-3xl object-cover shadow-lg ring-4 ring-white/90"
              src={session.playlist.imageUrl}
            />
          )}
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-cyan-700">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Final ranking
            </p>
            <h2 className="mt-1 text-3xl font-black text-sky-950">{session.playlist.name}</h2>
            <p className="mt-1 text-sky-900/70">
              {rankedTracks.length} songs sorted in {session.comparisonsMade} matchups
            </p>
          </div>
        </div>

        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 font-bold text-sky-800 shadow-lg ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:shadow-xl"
          onClick={onStartOver}
          type="button"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Start Over
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        {rankedTracks.map(({ groupId, rank, tieSize, track }) => (
          <article
            className="grid grid-cols-[auto_1fr] gap-4 rounded-[1.35rem] border border-white/80 bg-white/75 p-3 text-left shadow-sm sm:grid-cols-[auto_auto_1fr_auto] sm:items-center"
            key={`${groupId}-${track.id}`}
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-cyan-100 to-lime-100 text-lg font-black text-sky-900 shadow-inner">
              {rank}
            </div>
            {track.albumArtUrl && (
              <img alt="" className="h-14 w-14 rounded-2xl object-cover shadow-sm" src={track.albumArtUrl} />
            )}
            <div className="min-w-0">
              <h3 className="truncate font-black text-sky-950">{track.title}</h3>
              <p className="truncate text-sm text-sky-900/70">{track.artist}</p>
            </div>
            {tieSize > 1 && (
              <span className="col-span-2 rounded-full bg-lime-100 px-3 py-1 text-center text-xs font-black text-lime-800 sm:col-span-1">
                Tied rank
              </span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
