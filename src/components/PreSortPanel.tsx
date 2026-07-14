import { ListMusic, Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  estimateMergeSortMatchups,
  pickRandomSubset,
  type SortMode,
} from "../lib/sortingEngine";
import type { SortableTrack, SpotifyPlaylistForSorting } from "../lib/spotifyPlaylist";

type PreSortPanelProps = {
  playlist: SpotifyPlaylistForSorting;
  onStart: (tracks: SortableTrack[], mode: SortMode, requestedSubsetSize: number | null) => void;
};

export function PreSortPanel({ playlist, onStart }: PreSortPanelProps) {
  const trackCount = playlist.tracks.length;
  const isLargePlaylist = trackCount > 50;
  const [subsetSize, setSubsetSize] = useState(Math.min(50, Math.max(trackCount, 1)));
  const safeSubsetSize = Math.min(Math.max(subsetSize, Math.min(trackCount, 2)), trackCount);
  const allEstimate = useMemo(() => estimateMergeSortMatchups(trackCount), [trackCount]);
  const subsetEstimate = useMemo(() => estimateMergeSortMatchups(safeSubsetSize), [safeSubsetSize]);

  if (trackCount === 0) {
    return (
      <section className="mx-auto mt-8 w-full max-w-4xl rounded-[2rem] border border-white/80 bg-white/65 p-6 text-center shadow-[0_20px_60px_rgba(54,128,171,0.18)] backdrop-blur-md">
        <h2 className="text-2xl font-black text-sky-950">No sortable songs found</h2>
        <p className="mt-2 text-sky-900/70">This playlist only returned local files, podcasts, or unavailable items.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-8 w-full max-w-4xl rounded-[2rem] border border-white/80 bg-white/65 p-6 shadow-[0_20px_60px_rgba(54,128,171,0.18)] backdrop-blur-md">
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
            {trackCount} valid songs from {playlist.ownerName}
            {playlist.filteredOutCount > 0 ? `, ${playlist.filteredOutCount} local or non-song items skipped` : ""}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/80 bg-gradient-to-b from-white/80 to-cyan-50/70 p-5 shadow-inner">
        {isLargePlaylist ? (
          <>
            <div className="flex items-start gap-3 text-left">
              <Sparkles className="mt-1 h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />
              <div>
                <h3 className="text-xl font-black text-sky-950">This playlist is large.</h3>
                <p className="mt-1 text-sky-900/75">
                  Do you want to sort all {trackCount} songs (estimated {allEstimate} matchups), or pick a random
                  subset?
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <label className="text-left">
                <span className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
                  Random subset size
                </span>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    className="h-3 flex-1 accent-cyan-500"
                    max={trackCount}
                    min={2}
                    onChange={(event) => setSubsetSize(Number(event.target.value))}
                    type="range"
                    value={safeSubsetSize}
                  />
                  <input
                    className="min-h-11 w-28 rounded-full border border-cyan-100 bg-white px-4 text-center font-black text-sky-950 shadow-inner outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                    max={trackCount}
                    min={2}
                    onChange={(event) => setSubsetSize(Number(event.target.value))}
                    type="number"
                    value={safeSubsetSize}
                  />
                </div>
                <span className="mt-2 block text-sm text-sky-900/70">
                  {safeSubsetSize} songs, estimated {subsetEstimate} matchups
                </span>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-lime-200 to-cyan-300 px-6 font-black text-sky-900 shadow-lg shadow-cyan-200/50 ring-1 ring-white/90 transition hover:-translate-y-0.5 hover:shadow-xl"
                  onClick={() => onStart(pickRandomSubset(playlist.tracks, safeSubsetSize), "subset", safeSubsetSize)}
                  type="button"
                >
                  <Shuffle className="h-5 w-5" aria-hidden="true" />
                  Random subset
                </button>
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 font-black text-sky-800 shadow-lg ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:shadow-xl"
                  onClick={() => onStart(playlist.tracks, "all", null)}
                  type="button"
                >
                  <ListMusic className="h-5 w-5" aria-hidden="true" />
                  Sort all
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-5 text-left sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-sky-950">Small enough to sort in one pass</h3>
              <p className="mt-1 text-sky-900/75">
                Sort all {trackCount} songs, estimated {allEstimate} matchups.
              </p>
            </div>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-lime-200 to-cyan-300 px-7 font-black text-sky-900 shadow-lg shadow-cyan-200/50 ring-1 ring-white/90 transition hover:-translate-y-0.5 hover:shadow-xl"
              onClick={() => onStart(playlist.tracks, "all", null)}
              type="button"
            >
              <ListMusic className="h-5 w-5" aria-hidden="true" />
              Start sorting
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
