import { spotifyApi } from "./spotifyAuth";

const SPOTIFY_PLAYLIST_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

export type SortableTrack = {
  id: string;
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumName: string;
  albumArtUrl: string;
  previewUrl: string | null;
  spotifyUrl: string;
  durationMs: number;
};

export type SpotifyPlaylistForSorting = {
  id: string;
  name: string;
  ownerName: string;
  imageUrl: string;
  totalItems: number;
  tracks: SortableTrack[];
  filteredOutCount: number;
};

type SpotifyImage = {
  url: string;
  height: number | null;
  width: number | null;
};

type SpotifyPlaylistSummaryResponse = {
  id: string;
  name: string;
  images: SpotifyImage[];
  owner: {
    display_name: string | null;
  };
  tracks: {
    total: number;
  };
};

type SpotifyArtist = {
  name: string;
};

type SpotifyAlbum = {
  name: string;
  images: SpotifyImage[];
};

type SpotifyPlaylistTrack = {
  id: string | null;
  name: string;
  type: string;
  is_local: boolean;
  preview_url: string | null;
  duration_ms: number;
  external_urls: {
    spotify?: string;
  };
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
};

type SpotifyPlaylistTrackItem = {
  track: SpotifyPlaylistTrack | null;
};

type SpotifyPlaylistTracksPage = {
  items: SpotifyPlaylistTrackItem[];
  next: string | null;
  total: number;
};

export function extractSpotifyPlaylistId(input: string) {
  const trimmedInput = input.trim();

  if (SPOTIFY_PLAYLIST_ID_PATTERN.test(trimmedInput)) {
    return trimmedInput;
  }

  if (trimmedInput.startsWith("spotify:playlist:")) {
    const playlistId = trimmedInput.split(":").at(-1) ?? "";
    return SPOTIFY_PLAYLIST_ID_PATTERN.test(playlistId) ? playlistId : null;
  }

  try {
    const url = new URL(trimmedInput);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const playlistIndex = pathParts.indexOf("playlist");
    const playlistId = playlistIndex >= 0 ? pathParts[playlistIndex + 1] : "";

    return SPOTIFY_PLAYLIST_ID_PATTERN.test(playlistId) ? playlistId : null;
  } catch {
    const playlistId = trimmedInput.match(/playlist\/([A-Za-z0-9]{22})/)?.[1];
    return playlistId ?? null;
  }
}

export async function fetchSpotifyPlaylistForSorting(input: string): Promise<SpotifyPlaylistForSorting> {
  const playlistId = extractSpotifyPlaylistId(input);

  if (!playlistId) {
    throw new Error("Please paste a valid Spotify playlist URL.");
  }

  const [summary, tracks] = await Promise.all([fetchPlaylistSummary(playlistId), fetchAllPlaylistTracks(playlistId)]);
  const imageUrl = pickLargestImage(summary.images);

  return {
    id: summary.id,
    name: summary.name,
    ownerName: summary.owner.display_name ?? "Spotify user",
    imageUrl,
    totalItems: summary.tracks.total,
    tracks,
    filteredOutCount: Math.max(summary.tracks.total - tracks.length, 0),
  };
}

async function fetchPlaylistSummary(playlistId: string) {
  const fields = "id,name,images,owner(display_name),tracks(total)";

  return spotifyApi<SpotifyPlaylistSummaryResponse>(`/playlists/${playlistId}?${new URLSearchParams({ fields })}`);
}

async function fetchAllPlaylistTracks(playlistId: string) {
  const fields =
    "items(track(id,name,type,is_local,preview_url,duration_ms,external_urls,artists(name),album(name,images))),next,total";
  let url: string | null = `/playlists/${playlistId}/tracks?${new URLSearchParams({ fields, limit: "100" })}`;
  const tracks: SortableTrack[] = [];
  let playlistPosition = 0;

  while (url) {
    const page: SpotifyPlaylistTracksPage = await spotifyApi<SpotifyPlaylistTracksPage>(url);

    for (const item of page.items) {
      const track = normalizeTrack(item.track, playlistPosition);
      playlistPosition += 1;

      if (track) {
        tracks.push(track);
      }
    }

    url = page.next;
  }

  return tracks;
}

function normalizeTrack(track: SpotifyPlaylistTrack | null, playlistPosition: number): SortableTrack | null {
  if (!track || track.type !== "track" || track.is_local || !track.id) {
    return null;
  }

  return {
    id: `${track.id}-${playlistPosition}`,
    spotifyTrackId: track.id,
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(", ") || "Unknown artist",
    albumName: track.album.name,
    albumArtUrl: pickLargestImage(track.album.images),
    previewUrl: track.preview_url,
    spotifyUrl: track.external_urls.spotify ?? "",
    durationMs: track.duration_ms,
  };
}

function pickLargestImage(images: SpotifyImage[]) {
  return [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? "";
}
