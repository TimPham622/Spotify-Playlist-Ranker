const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";

const TOKEN_STORAGE_KEY = "spotify-bias-sorter:token";
const CODE_VERIFIER_KEY = "spotify-bias-sorter:code-verifier";
const AUTH_STATE_KEY = "spotify-bias-sorter:auth-state";
const REDACTED_VALUE = "[redacted]";

export const SPOTIFY_SCOPES = ["playlist-read-private"] as const;

export type SpotifyToken = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  expires_at: number;
  refresh_token?: string;
};

type SpotifyTokenResponse = Omit<SpotifyToken, "expires_at">;

export type SpotifyErrorBody = {
  error?: string | { status?: number; message?: string; reason?: string };
  error_description?: string;
  [key: string]: unknown;
};

export class SpotifyApiError extends Error {
  status: number;
  url: string;
  body: SpotifyErrorBody | null;
  spotifyMessage: string | null;

  constructor(status: number, url: string, body: SpotifyErrorBody | null) {
    const spotifyMessage = extractSpotifyErrorMessage(body);

    super(buildSpotifyApiErrorMessage(status, spotifyMessage));
    this.name = "SpotifyApiError";
    this.status = status;
    this.url = url;
    this.body = body;
    this.spotifyMessage = spotifyMessage;
  }
}

function getClientId() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing VITE_SPOTIFY_CLIENT_ID in .env.local.");
  }

  return clientId;
}

export function getSpotifyRedirectUri() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

function generateRandomString(length = 64) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(values, (value) => possible[value % possible.length]).join("");
}

async function sha256(value: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

function base64UrlEncode(value: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function createCodeChallenge(codeVerifier: string) {
  return base64UrlEncode(await sha256(codeVerifier));
}

function withExpiry(token: SpotifyTokenResponse, previousRefreshToken?: string): SpotifyToken {
  return {
    ...token,
    refresh_token: token.refresh_token ?? previousRefreshToken,
    expires_at: Date.now() + token.expires_in * 1000,
  };
}

function storeToken(token: SpotifyToken) {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
  return token;
}

export function getStoredSpotifyToken() {
  const rawToken = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (!rawToken) {
    return null;
  }

  try {
    return JSON.parse(rawToken) as SpotifyToken;
  } catch {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

function isExpired(token: SpotifyToken) {
  return token.expires_at <= Date.now() + 60_000;
}

async function parseSpotifyTokenResponse(response: Response) {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error_description ?? body?.error ?? `Spotify auth failed (${response.status}).`);
  }

  return body as SpotifyTokenResponse;
}

export async function loginWithSpotify() {
  const codeVerifier = generateRandomString();
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(AUTH_STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    scope: SPOTIFY_SCOPES.join(" "),
    redirect_uri: getSpotifyRedirectUri(),
    state,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  window.location.assign(`${SPOTIFY_AUTH_URL}?${params.toString()}`);
}

export async function handleSpotifyCallback() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const code = params.get("code");

  if (error) {
    cleanCallbackUrl();
    throw new Error(`Spotify authorization failed: ${error}`);
  }

  if (!code) {
    return null;
  }

  const expectedState = sessionStorage.getItem(AUTH_STATE_KEY);
  const returnedState = params.get("state");

  if (!expectedState || expectedState !== returnedState) {
    cleanAuthRequest();
    cleanCallbackUrl();
    throw new Error("Spotify authorization state mismatch. Please try logging in again.");
  }

  const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);

  if (!codeVerifier) {
    cleanAuthRequest();
    cleanCallbackUrl();
    throw new Error("Missing Spotify PKCE verifier. Please log in again.");
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      grant_type: "authorization_code",
      code,
      redirect_uri: getSpotifyRedirectUri(),
      code_verifier: codeVerifier,
    }),
  });

  const token = storeToken(withExpiry(await parseSpotifyTokenResponse(response)));

  cleanAuthRequest();
  cleanCallbackUrl();

  return token;
}

export async function getValidSpotifyAccessToken() {
  const token = getStoredSpotifyToken();

  if (!token) {
    return null;
  }

  if (!isExpired(token)) {
    return token.access_token;
  }

  if (!token.refresh_token) {
    logoutSpotify();
    return null;
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    }),
  });

  return storeToken(withExpiry(await parseSpotifyTokenResponse(response), token.refresh_token)).access_token;
}

export async function spotifyApi<T>(pathOrUrl: string, init: RequestInit = {}) {
  const accessToken = await getValidSpotifyAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated with Spotify.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  const url = pathOrUrl.startsWith("https://")
    ? pathOrUrl
    : `${SPOTIFY_API_BASE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    const body = await readSpotifyErrorBody(response);

    if (import.meta.env.DEV) {
      console.warn("Spotify API request failed", {
        url,
        status: response.status,
        body: sanitizeSpotifyErrorBody(body),
      });
    }

    throw new SpotifyApiError(response.status, url, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function extractSpotifyErrorMessage(body: SpotifyErrorBody | null) {
  if (!body) {
    return null;
  }

  if (body.error && typeof body.error === "object" && typeof body.error.message === "string") {
    return body.error.message;
  }

  if (typeof body.error_description === "string") {
    return body.error_description;
  }

  if (typeof body.error === "string") {
    return body.error;
  }

  return null;
}

function buildSpotifyApiErrorMessage(status: number, spotifyMessage: string | null) {
  if (status === 403) {
    const details = spotifyMessage && spotifyMessage.toLowerCase() !== "forbidden" ? ` Spotify said: ${spotifyMessage}` : "";
    return `Spotify API request failed (403). Spotify blocked this request; this can happen when your account is not enabled for this development-mode app or when the playlist is not owned/collaborated by the signed-in user.${details}`;
  }

  return `Spotify API request failed (${status})${spotifyMessage ? `: ${spotifyMessage}` : "."}`;
}

async function readSpotifyErrorBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json().catch(() => null) as Promise<SpotifyErrorBody | null>;
}

function sanitizeSpotifyErrorBody(body: SpotifyErrorBody | null): SpotifyErrorBody | null {
  return sanitizeValue(body) as SpotifyErrorBody | null;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, childValue]) => [
      key,
      shouldRedactKey(key) ? REDACTED_VALUE : sanitizeValue(childValue),
    ]),
  );
}

function shouldRedactKey(key: string) {
  const normalizedKey = key.toLowerCase();
  return (
    normalizedKey.includes("authorization") ||
    normalizedKey.includes("access_token") ||
    normalizedKey.includes("refresh_token") ||
    normalizedKey.includes("client_secret") ||
    normalizedKey === "token" ||
    normalizedKey === "secret"
  );
}

export function logoutSpotify() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  cleanAuthRequest();
}

function cleanAuthRequest() {
  sessionStorage.removeItem(CODE_VERIFIER_KEY);
  sessionStorage.removeItem(AUTH_STATE_KEY);
}

function cleanCallbackUrl() {
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);
}
