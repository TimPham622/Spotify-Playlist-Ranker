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
    <article className="flex min-h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/85 bg-white/70 p-5 text-left shadow-[0_18px_45px_rgba(54,128,171,0.18)] backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-cyan-800">
          {label}
        </span>
        {showTieInfo && group.tracks.length > 1 && (
          <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black text-lime-800">
            Tie group of {group.tracks.length}
          </span>
        )}
      </div>

      <div className="mt-5 min-w-0">
        <h3 className="text-2xl font-black leading-tight text-sky-950">{representative.title}</h3>
        <p className="mt-1 text-sky-900/75">{representative.artist}</p>
        <p className="mt-1 truncate text-sm text-sky-900/55">{representative.albumName}</p>
      </div>

      {showTieInfo && group.tracks.length > 1 && (
        <p className="mt-4 rounded-2xl bg-sky-50 px-3 py-2 text-sm text-sky-900/70">
          Also tied here: {tiedTrackNames.join(", ")}
          {group.tracks.length > 4 ? "..." : ""}
        </p>
      )}

      <div className="mt-auto pt-5">
        <iframe
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full rounded-[1.25rem] border-0 shadow-inner"
          height="152"
          key={representative.spotifyTrackId}
          loading="lazy"
          src={getSpotifyTrackEmbedUrl(representative.spotifyTrackId)}
          title={`Spotify player for ${representative.title} by ${representative.artist}`}
          width="100%"
        />
        <a
          className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-sky-800 shadow-sm ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:shadow-md"
          href={spotifyUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open in Spotify
        </a>
      </div>
    </article>
  );
}
