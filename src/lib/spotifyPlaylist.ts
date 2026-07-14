import { SpotifyApiError, spotifyApi } from "./spotifyAuth";

const SPOTIFY_PLAYLIST_ID_PATTERN = /^[A-Za-z0-9]{22}$/;
const PLAYLIST_ACCESS_RESTRICTION_MESSAGE =
  "Spotify only allows this development-mode app to read playlists that you own or collaborate on. If this is someone else's public playlist, copy its tracks into one of your own playlists and try again.";
const APP_ALLOWLIST_MESSAGE =
  "This Spotify account is not enabled as a test user for this development-mode app. Add the account in the Spotify Developer Dashboard user management area, then log out and back in.";
const GENERIC_FORBIDDEN_MESSAGE =
  "Spotify blocked this playlist request with a permissions error. Confirm the account is allowed to use this development-mode app, then try a playlist you own or collaborate on.";

export type SortableTrack = {
  id: string;
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumName: string;
  albumArtUrl: string;
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
  items: {
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
  duration_ms: number;
  external_urls: {
    spotify?: string;
  };
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
};

type SpotifyPlaylistItem = SpotifyPlaylistTrack | SpotifyUnsupportedPlaylistItem;

type SpotifyUnsupportedPlaylistItem = {
  id: string | null;
  name?: string;
  type: string;
  is_local?: boolean;
};

export type SpotifyPlaylistItemEntry = {
  item: SpotifyPlaylistItem | null;
  is_local?: boolean;
};

type SpotifyPlaylistItemsPage = {
  items: SpotifyPlaylistItemEntry[];
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

  try {
    const [summary, tracks] = await Promise.all([fetchPlaylistSummary(playlistId), fetchAllPlaylistTracks(playlistId)]);
    const imageUrl = pickLargestImage(summary.images);

    return {
      id: summary.id,
      name: summary.name,
      ownerName: summary.owner.display_name ?? "Spotify user",
      imageUrl,
      totalItems: summary.items.total,
      tracks,
      filteredOutCount: Math.max(summary.items.total - tracks.length, 0),
    };
  } catch (error) {
    if (error instanceof SpotifyApiError && error.status === 403) {
      throw new Error(getSpotifyPlaylistForbiddenMessage(error), { cause: error });
    }

    throw error;
  }
}

async function fetchPlaylistSummary(playlistId: string) {
  const fields = "id,name,images,owner(display_name),items(total)";

  return spotifyApi<SpotifyPlaylistSummaryResponse>(`/playlists/${playlistId}?${new URLSearchParams({ fields })}`);
}

async function fetchAllPlaylistTracks(playlistId: string) {
  const fields =
    "items(is_local,item(id,name,type,is_local,duration_ms,external_urls,artists(name),album(name,images))),next,total";
  let url: string | null = `/playlists/${playlistId}/items?${new URLSearchParams({ fields, limit: "50" })}`;
  const tracks: SortableTrack[] = [];
  let playlistPosition = 0;

  while (url) {
    const page: SpotifyPlaylistItemsPage = await spotifyApi<SpotifyPlaylistItemsPage>(url);

    for (const item of page.items) {
      const track = normalizePlaylistItem(item, playlistPosition);
      playlistPosition += 1;

      if (track) {
        tracks.push(track);
      }
    }

    url = page.next;
  }

  return tracks;
}

export function normalizePlaylistItem(entry: SpotifyPlaylistItemEntry, playlistPosition: number): SortableTrack | null {
  const item = entry.item;

  if (!isSpotifyPlaylistTrack(item) || entry.is_local || item.is_local || !item.id) {
    return null;
  }

  return {
    id: `${item.id}-${playlistPosition}`,
    spotifyTrackId: item.id,
    title: item.name,
    artist: item.artists.map((artist) => artist.name).join(", ") || "Unknown artist",
    albumName: item.album.name,
    albumArtUrl: pickLargestImage(item.album.images),
    spotifyUrl: item.external_urls.spotify ?? "",
    durationMs: item.duration_ms,
  };
}

function isSpotifyPlaylistTrack(item: SpotifyPlaylistItem | null): item is SpotifyPlaylistTrack {
  return item?.type === "track" && "artists" in item && "album" in item;
}

export function getSpotifyPlaylistForbiddenMessage(error: SpotifyApiError) {
  const message = error.spotifyMessage?.toLowerCase() ?? "";

  if (message.includes("not registered") || message.includes("allowlist") || message.includes("allowlisted")) {
    return APP_ALLOWLIST_MESSAGE;
  }

  if (
    message.includes("collaborator") ||
    message.includes("owner") ||
    message.includes("not accessible") ||
    message.includes("forbidden")
  ) {
    return PLAYLIST_ACCESS_RESTRICTION_MESSAGE;
  }

  return `${GENERIC_FORBIDDEN_MESSAGE} Spotify returned HTTP 403.`;
}

function pickLargestImage(images: SpotifyImage[]) {
  return [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? "";
}
