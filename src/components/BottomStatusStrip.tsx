import { useEffect, useState } from "react";

type BottomStatusStripProps = {
  status: string;
  playlistName?: string;
  modeLabel?: string;
  matchupText?: string;
  onStartOver?: () => void;
  onLogout?: () => void;
  sticky?: boolean;
};

function getMinuteTimestamp() {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.getTime();
}

export function BottomStatusStrip({
  status,
  playlistName,
  modeLabel,
  matchupText,
  onStartOver,
  onLogout,
  sticky = false,
}: BottomStatusStripProps) {
  const [minuteTimestamp, setMinuteTimestamp] = useState(getMinuteTimestamp);
  const date = new Date(minuteTimestamp);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMinuteTimestamp(getMinuteTimestamp());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <footer className={`status-strip ${sticky ? "status-strip-sticky" : ""}`} aria-label="Application status">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          Status: <strong>{status}</strong>
        </span>
        {playlistName && (
          <span className="min-w-0 truncate">
            Playlist: <strong>{playlistName}</strong>
          </span>
        )}
        {modeLabel && (
          <span>
            Mode: <strong>{modeLabel}</strong>
          </span>
        )}
        {matchupText && (
          <span>
            Matchup: <strong>{matchupText}</strong>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <time className="status-clock" dateTime={date.toISOString()} aria-label="Local time">
          {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
          {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </time>
        {onStartOver && (
          <button className="console-button console-button-compact" onClick={onStartOver} type="button">
            Start over
          </button>
        )}
        {onLogout && (
          <button className="console-button console-button-compact" onClick={onLogout} type="button">
            Log out
          </button>
        )}
      </div>
    </footer>
  );
}
