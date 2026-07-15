import { RefreshCcw, Trophy } from "lucide-react";
import { getModeLabel, getRankedTracks, isFastSortSession, type SortSession } from "../lib/sortingEngine";

type ResultsViewProps = {
  session: SortSession;
  onStartOver: () => void;
};

export function ResultsView({ session, onStartOver }: ResultsViewProps) {
  const rankedTracks = getRankedTracks(session);
  const isFastMode = isFastSortSession(session);
  const heading = isFastMode ? "Approximate top 10" : "Final ranking";

  return (
    <section className="console-panel mt-4">
      <div className="console-panel-inner">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {session.playlist.imageUrl && (
            <img
              alt=""
              className="playlist-cover"
              src={session.playlist.imageUrl}
            />
          )}
          <div>
            <p className="console-label mb-1 inline-flex items-center gap-2">
              <Trophy className="console-icon console-icon-primary" aria-hidden="true" />
              {heading}
            </p>
            <h2 className="console-section-title">{session.playlist.name}</h2>
            <p className="console-text mt-1">
              {rankedTracks.length} songs shown from {getModeLabel(session)} in {session.comparisonsMade} matchups
            </p>
            {isFastMode && (
              <p className="message-panel mt-2 max-w-2xl">
                Fast top 10 is approximate: it uses a two-loss qualification round, then ranks the strongest finalists.
                A full ranking can produce different results.
              </p>
            )}
          </div>
        </div>

        <button
          className="console-button"
          onClick={onStartOver}
          type="button"
        >
          <RefreshCcw className="console-icon" aria-hidden="true" />
          Start Over
        </button>
      </div>

      <div className="results-list mt-4">
        {rankedTracks.map(({ groupId, rank, tieSize, track }) => (
          <article
            className="results-row"
            key={`${groupId}-${track.id}`}
          >
            <div className="rank-cell">{rank}</div>
            {track.albumArtUrl && (
              <img alt="" className="result-art" src={track.albumArtUrl} />
            )}
            <div className="min-w-0">
              <h3 className="console-card-title truncate">{track.title}</h3>
              <p className="console-text truncate">{track.artist}</p>
            </div>
            {!isFastMode && tieSize > 1 && (
              <span className="small-badge">
                Tied rank
              </span>
            )}
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}
