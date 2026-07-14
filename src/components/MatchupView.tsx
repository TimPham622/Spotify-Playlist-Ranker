import { Heart, RefreshCcw, Trophy } from "lucide-react";
import { getCurrentMatchup, type SortChoice, type SortSession } from "../lib/sortingEngine";
import { SongGroupCard } from "./SongGroupCard";

type MatchupViewProps = {
  session: SortSession;
  onChoose: (choice: SortChoice) => void;
  onStartOver: () => void;
};

export function MatchupView({ session, onChoose, onStartOver }: MatchupViewProps) {
  const matchup = getCurrentMatchup(session);

  if (!matchup) {
    return null;
  }

  const currentMatchupNumber = session.comparisonsMade + 1;
  const displayedEstimate = Math.max(session.estimatedMatchups, currentMatchupNumber);
  const progressPercent =
    displayedEstimate === 0 ? 100 : Math.min((session.comparisonsMade / displayedEstimate) * 100, 100);

  return (
    <section className="mx-auto mt-8 w-full max-w-6xl">
      <div className="rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-[0_20px_60px_rgba(54,128,171,0.18)] backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-700">
              Matchup {currentMatchupNumber} of ~{displayedEstimate}
            </p>
            <h2 className="mt-1 text-3xl font-black text-sky-950">Which song do you like more?</h2>
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

        <div className="mt-5 h-4 overflow-hidden rounded-full bg-white shadow-inner ring-1 ring-cyan-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-lime-300 via-cyan-300 to-sky-400 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid items-stretch gap-5 lg:grid-cols-2">
        <SongGroupCard group={matchup.left} label="Song A" />
        <SongGroupCard group={matchup.right} label="Song B" />
      </div>

      <div className="sticky bottom-4 z-10 mx-auto mt-6 grid max-w-4xl gap-3 rounded-[1.75rem] border border-white/80 bg-white/75 p-3 shadow-[0_18px_45px_rgba(54,128,171,0.22)] backdrop-blur-md sm:grid-cols-3">
        <button
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-5 font-black text-white shadow-lg shadow-sky-300/40 ring-1 ring-white/90 transition hover:-translate-y-0.5 hover:shadow-xl"
          onClick={() => onChoose("left")}
          type="button"
        >
          <Trophy className="h-5 w-5" aria-hidden="true" />
          Song A
        </button>
        <button
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-lime-200 to-cyan-300 px-5 font-black text-sky-900 shadow-lg shadow-cyan-200/50 ring-1 ring-white/90 transition hover:-translate-y-0.5 hover:shadow-xl"
          onClick={() => onChoose("tie")}
          type="button"
        >
          <Heart className="h-5 w-5" aria-hidden="true" />
          Tie (I like both)
        </button>
        <button
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-5 font-black text-white shadow-lg shadow-sky-300/40 ring-1 ring-white/90 transition hover:-translate-y-0.5 hover:shadow-xl"
          onClick={() => onChoose("right")}
          type="button"
        >
          <Trophy className="h-5 w-5" aria-hidden="true" />
          Song B
        </button>
      </div>
    </section>
  );
}
