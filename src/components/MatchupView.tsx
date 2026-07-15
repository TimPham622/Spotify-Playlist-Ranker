import { Heart, RefreshCcw, Trophy } from "lucide-react";
import {
  getCurrentMatchup,
  getSortProgress,
  isTieChoiceAllowed,
  type SortChoice,
  type SortSession,
} from "../lib/sortingEngine";
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

  const tieAllowed = isTieChoiceAllowed(session);
  const progress = getSortProgress(session);

  return (
    <section className="mt-4">
      <div className="console-panel">
        <div className="console-panel-inner">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="console-label mb-1">
              {progress.stageLabel}
            </p>
            <p className="console-text">
              Matchup {progress.currentMatchupNumber} of ~{progress.displayedEstimate}
            </p>
            <h2 className="console-section-title mt-1">Which song do you like more?</h2>
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

        <div className="progress-track mt-4" aria-label="Sorting progress">
          <div
            className="progress-fill"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
        </div>
      </div>

      <div className="matchup-grid mt-4">
        <SongGroupCard group={matchup.left} label="Song A" showTieInfo={tieAllowed} />
        <SongGroupCard group={matchup.right} label="Song B" showTieInfo={tieAllowed} />
      </div>

      <div
        className={`choice-bar mt-4 ${
          tieAllowed ? "choice-bar-three" : "choice-bar-two"
        }`}
      >
        <button
          className="console-button console-button-primary"
          onClick={() => onChoose("left")}
          type="button"
        >
          <Trophy className="console-icon console-icon-primary" aria-hidden="true" />
          Song A
        </button>
        {tieAllowed && (
          <button
            className="console-button"
            onClick={() => onChoose("tie")}
            type="button"
          >
            <Heart className="console-icon" aria-hidden="true" />
            Tie (I like both)
          </button>
        )}
        <button
          className="console-button console-button-primary"
          onClick={() => onChoose("right")}
          type="button"
        >
          <Trophy className="console-icon console-icon-primary" aria-hidden="true" />
          Song B
        </button>
      </div>
    </section>
  );
}
