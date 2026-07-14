import { ListMusic, Shuffle, Sparkles, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import {
  estimateFastTop10Matchups,
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
  const minSubsetSize = Math.min(trackCount, 2);
  const [subsetSize, setSubsetSize] = useState(Math.min(50, Math.max(trackCount, 1)));
  const safeSubsetSize = trackCount === 0 ? 0 : Math.min(Math.max(subsetSize, minSubsetSize), trackCount);
  const allEstimate = useMemo(() => estimateMergeSortMatchups(trackCount), [trackCount]);
  const fastEstimate = useMemo(() => estimateFastTop10Matchups(trackCount), [trackCount]);
  const subsetEstimate = useMemo(() => estimateMergeSortMatchups(safeSubsetSize), [safeSubsetSize]);
  const fastResultCount = Math.min(trackCount, 10);

  if (trackCount === 0) {
    return (
      <section className="mx-auto mt-8 w-full max-w-4xl rounded-[2rem] border border-white/80 bg-white/65 p-6 text-center shadow-[0_20px_60px_rgba(54,128,171,0.18)] backdrop-blur-md">
        <h2 className="text-2xl font-black text-sky-950">No sortable songs found</h2>
        <p className="mt-2 text-sky-900/70">This playlist only returned local files, podcasts, or unavailable items.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-8 w-full max-w-5xl rounded-[2rem] border border-white/80 bg-white/65 p-6 shadow-[0_20px_60px_rgba(54,128,171,0.18)] backdrop-blur-md">
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
        <div className="flex items-start gap-3 text-left">
          <Sparkles className="mt-1 h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />
          <div>
            <h3 className="text-xl font-black text-sky-950">Choose a ranking mode</h3>
            <p className="mt-1 text-sky-900/75">
              {trackCount > 50
                ? `This playlist is large, so Fast top 10 or a random subset can save a lot of clicks.`
                : `Full ranking is manageable here, but Fast top 10 is still available when you just want favourites.`}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-[1.5rem] border border-white/80 bg-white/75 p-4 text-left shadow-sm">
            <div className="flex items-center gap-2 text-cyan-700">
              <ListMusic className="h-5 w-5" aria-hidden="true" />
              <h4 className="font-black text-sky-950">Full ranking</h4>
            </div>
            <p className="mt-3 text-sm text-sky-900/75">
              Uses every valid song and produces a complete ordered ranking. Ties are allowed.
            </p>
            <p className="mt-3 rounded-2xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-800">
              Estimated {allEstimate} matchups
            </p>
            <button
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 font-black text-sky-800 shadow-lg ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:shadow-xl"
              onClick={() => onStart(playlist.tracks, "all", null)}
              type="button"
            >
              <ListMusic className="h-5 w-5" aria-hidden="true" />
              Start full ranking
            </button>
          </article>

          <article className="rounded-[1.5rem] border border-white/80 bg-white/75 p-4 text-left shadow-sm">
            <div className="flex items-center gap-2 text-cyan-700">
              <Zap className="h-5 w-5" aria-hidden="true" />
              <h4 className="font-black text-sky-950">Fast top 10</h4>
            </div>
            <p className="mt-3 text-sm text-sky-900/75">
              Quickly estimate your top 10 using a two-loss qualification round, followed by a final ranking of the
              strongest candidates.
            </p>
            <p className="mt-3 rounded-2xl bg-lime-50 px-3 py-2 text-sm font-bold text-lime-800">
              Approx. {fastEstimate} matchups, no ties, returns {fastResultCount} song
              {fastResultCount === 1 ? "" : "s"}
            </p>
            <button
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-lime-200 to-cyan-300 px-6 font-black text-sky-900 shadow-lg shadow-cyan-200/50 ring-1 ring-white/90 transition hover:-translate-y-0.5 hover:shadow-xl"
              onClick={() => onStart(playlist.tracks, "fast", null)}
              type="button"
            >
              <Zap className="h-5 w-5" aria-hidden="true" />
              Find fast top 10
            </button>
          </article>

          <article className="rounded-[1.5rem] border border-white/80 bg-white/75 p-4 text-left shadow-sm">
            <div className="flex items-center gap-2 text-cyan-700">
              <Shuffle className="h-5 w-5" aria-hidden="true" />
              <h4 className="font-black text-sky-950">Random subset</h4>
            </div>
            <p className="mt-3 text-sm text-sky-900/75">
              Randomly selects the requested number of songs, then fully ranks that subset. Ties are allowed.
            </p>
            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">Subset size</span>
              <div className="mt-3 flex flex-col gap-3">
                <input
                  className="h-3 flex-1 accent-cyan-500"
                  max={trackCount}
                  min={minSubsetSize}
                  onChange={(event) => setSubsetSize(Number(event.target.value))}
                  type="range"
                  value={safeSubsetSize}
                />
                <input
                  className="min-h-11 w-full rounded-full border border-cyan-100 bg-white px-4 text-center font-black text-sky-950 shadow-inner outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                  max={trackCount}
                  min={minSubsetSize}
                  onChange={(event) => setSubsetSize(Number(event.target.value))}
                  type="number"
                  value={safeSubsetSize}
                />
              </div>
            </label>
            <p className="mt-3 rounded-2xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-800">
              {safeSubsetSize} songs, estimated {subsetEstimate} matchups
            </p>
            <button
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 font-black text-sky-800 shadow-lg ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:shadow-xl"
              onClick={() => onStart(pickRandomSubset(playlist.tracks, safeSubsetSize), "subset", safeSubsetSize)}
              type="button"
            >
              <Shuffle className="h-5 w-5" aria-hidden="true" />
              Sort random subset
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
