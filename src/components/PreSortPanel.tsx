import { ListMusic, Shuffle, Zap } from "lucide-react";
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
      <section className="console-panel mt-4">
        <div className="console-panel-inner">
          <h2 className="console-section-title">No sortable songs found</h2>
          <p className="console-text mt-1">This playlist only returned local files, podcasts, or unavailable items.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="console-panel mt-4">
      <div className="console-panel-inner">
        <div className="playlist-info">
          {playlist.imageUrl && <img alt="" className="playlist-cover" src={playlist.imageUrl} />}
          <div className="min-w-0">
            <p className="console-label mb-1">Loaded playlist</p>
            <h2 className="console-section-title truncate">{playlist.name}</h2>
            <p className="console-text mt-1">
              {trackCount} valid songs from {playlist.ownerName}
              {playlist.filteredOutCount > 0 ? `, ${playlist.filteredOutCount} local or non-song items skipped` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--console-border)] pt-4">
          <h3 className="console-section-title">Choose a ranking mode</h3>
          <p className="console-text mt-1">
            {trackCount > 50
              ? "This playlist is large. Fast top 10 or a random subset can reduce the number of comparisons."
              : "Full ranking is manageable here, and the faster modes remain available."}
          </p>
        </div>

        <div className="mode-grid mt-4">
          <article className="channel-tile">
            <div className="channel-tile-header">
              <ListMusic className="console-icon console-icon-primary" aria-hidden="true" />
              <h4 className="console-card-title">Full ranking</h4>
            </div>
            <p className="console-text mt-3">
              Uses every valid song and produces a complete ordered ranking. Ties are allowed.
            </p>
            <p className="channel-tile-meta">Estimated {allEstimate} matchups</p>
            <button
              className="console-button console-button-primary mt-auto w-full"
              onClick={() => onStart(playlist.tracks, "all", null)}
              type="button"
            >
              <ListMusic className="console-icon console-icon-primary" aria-hidden="true" />
              Start full ranking
            </button>
          </article>

          <article className="channel-tile">
            <div className="channel-tile-header">
              <Zap className="console-icon console-icon-primary" aria-hidden="true" />
              <h4 className="console-card-title">Fast top 10</h4>
            </div>
            <p className="console-text mt-3">
              Quickly estimate your top 10 using a two-loss qualification round, followed by a final ranking of the
              strongest candidates.
            </p>
            <p className="channel-tile-meta">
              Approx. {fastEstimate} matchups, no ties, returns {fastResultCount} song
              {fastResultCount === 1 ? "" : "s"}
            </p>
            <button
              className="console-button console-button-primary mt-auto w-full"
              onClick={() => onStart(playlist.tracks, "fast", null)}
              type="button"
            >
              <Zap className="console-icon console-icon-primary" aria-hidden="true" />
              Find fast top 10
            </button>
          </article>

          <article className="channel-tile">
            <div className="channel-tile-header">
              <Shuffle className="console-icon console-icon-primary" aria-hidden="true" />
              <h4 className="console-card-title">Random subset</h4>
            </div>
            <p className="console-text mt-3">
              Randomly selects the requested number of songs, then fully ranks that subset. Ties are allowed.
            </p>
            <label className="mt-4 block">
              <span className="console-label">Subset size</span>
              <div className="mt-3 flex flex-col gap-3">
                <input
                  className="range-control"
                  max={trackCount}
                  min={minSubsetSize}
                  onChange={(event) => setSubsetSize(Number(event.target.value))}
                  type="range"
                  value={safeSubsetSize}
                />
                <input
                  className="console-input text-center"
                  max={trackCount}
                  min={minSubsetSize}
                  onChange={(event) => setSubsetSize(Number(event.target.value))}
                  type="number"
                  value={safeSubsetSize}
                />
              </div>
            </label>
            <p className="channel-tile-meta">
              {safeSubsetSize} songs, estimated {subsetEstimate} matchups
            </p>
            <button
              className="console-button console-button-primary mt-auto w-full"
              onClick={() => onStart(pickRandomSubset(playlist.tracks, safeSubsetSize), "subset", safeSubsetSize)}
              type="button"
            >
              <Shuffle className="console-icon console-icon-primary" aria-hidden="true" />
              Sort random subset
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
