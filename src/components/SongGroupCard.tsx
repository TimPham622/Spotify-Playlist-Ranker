import type { RankGroup } from "../lib/sortingEngine";

type SongGroupCardProps = {
  group: RankGroup;
  label: string;
};

export function SongGroupCard({ group, label }: SongGroupCardProps) {
  const representative = group.tracks[0];
  const tiedTrackNames = group.tracks.slice(1, 4).map((track) => track.title);

  return (
    <article className="flex min-h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/85 bg-white/70 p-4 text-left shadow-[0_18px_45px_rgba(54,128,171,0.18)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-cyan-800">
          {label}
        </span>
        {group.tracks.length > 1 && (
          <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black text-lime-800">
            Tie group of {group.tracks.length}
          </span>
        )}
      </div>

      {representative.albumArtUrl ? (
        <img
          alt=""
          className="mt-4 aspect-square w-full rounded-[1.35rem] object-cover shadow-lg ring-4 ring-white/90"
          src={representative.albumArtUrl}
        />
      ) : (
        <div className="mt-4 grid aspect-square w-full place-items-center rounded-[1.35rem] bg-gradient-to-b from-cyan-100 to-lime-100 text-sm font-black text-sky-800 shadow-inner">
          No artwork
        </div>
      )}

      <div className="mt-4 min-w-0">
        <h3 className="text-2xl font-black leading-tight text-sky-950">{representative.title}</h3>
        <p className="mt-1 text-sky-900/75">{representative.artist}</p>
        <p className="mt-1 truncate text-sm text-sky-900/55">{representative.albumName}</p>
      </div>

      {group.tracks.length > 1 && (
        <p className="mt-3 rounded-2xl bg-sky-50 px-3 py-2 text-sm text-sky-900/70">
          Also tied here: {tiedTrackNames.join(", ")}
          {group.tracks.length > 4 ? "..." : ""}
        </p>
      )}

      <div className="mt-auto pt-4">
        {representative.previewUrl ? (
          <audio className="w-full" controls preload="none" src={representative.previewUrl}>
            <a href={representative.previewUrl}>Audio preview</a>
          </audio>
        ) : (
          <span className="inline-flex rounded-full bg-sky-100 px-3 py-2 text-sm font-bold text-sky-700">
            No audio preview available
          </span>
        )}
      </div>
    </article>
  );
}
