import type { RankGroup } from "../lib/sortingEngine";
import { getSpotifyTrackEmbedUrl } from "../lib/spotifyEmbeds";

type SongGroupCardProps = {
  group: RankGroup;
  label: string;
  showTieInfo: boolean;
};

export function SongGroupCard({ group, label, showTieInfo }: SongGroupCardProps) {
  const representative = group.tracks[0];
  const tiedTrackNames = group.tracks.slice(1, 4).map((track) => track.title);
  const spotifyUrl = representative.spotifyUrl || `https://open.spotify.com/track/${representative.spotifyTrackId}`;

  return (
    <article className="song-channel">
      <div className="song-channel-strip">
        <span>{label}</span>
        {showTieInfo && group.tracks.length > 1 && (
          <span className="small-badge">
            Tie group of {group.tracks.length}
          </span>
        )}
      </div>

      <div className="song-channel-body">
        <div className="min-w-0">
          <h3 className="console-section-title">{representative.title}</h3>
          <p className="console-text mt-1">{representative.artist}</p>
          <p className="console-text mt-1 truncate">{representative.albumName}</p>
        </div>

        {showTieInfo && group.tracks.length > 1 && (
          <p className="message-panel mt-3">
            Also tied here: {tiedTrackNames.join(", ")}
            {group.tracks.length > 4 ? "..." : ""}
          </p>
        )}

        <div className="spotify-frame mt-4">
          <iframe
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            height="152"
            key={representative.spotifyTrackId}
            loading="lazy"
            src={getSpotifyTrackEmbedUrl(representative.spotifyTrackId)}
            title={`Spotify player for ${representative.title} by ${representative.artist}`}
            width="100%"
          />
        </div>
        <a className="console-button console-button-compact mt-3 self-start" href={spotifyUrl} rel="noreferrer" target="_blank">
          Open in Spotify
        </a>
      </div>
    </article>
  );
}
