# Spotify Bias Sorter

A static, frontend-only React app for ranking a Spotify playlist through head-to-head matchups. It uses Spotify Authorization Code with PKCE, fetches playlist tracks directly from the Spotify Web API, and stores sorting progress in `localStorage` so a refresh does not wipe out an in-progress ranking.

## Features

- Spotify PKCE login with `playlist-read-private`
- Playlist support for tracks the logged-in user is allowed to read
- Spotify playlist URL, URI, or raw playlist ID parsing
- Local file, podcast, and unavailable item filtering
- Large-playlist pre-sort with estimated matchup counts
- Random subset sorting for click reduction
- Serializable merge-sort state machine
- Tie grouping, including shared final ranks like `1, 2, 2, 4`
- 30-second preview audio when Spotify provides `preview_url`
- Refresh-safe progress persistence with a Start Over reset
- Bright Frutiger Aero-inspired UI instead of Spotify dark mode
- `HashRouter` for GitHub Pages compatibility

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
```

Run the app:

```bash
npm run dev
```

The Vite dev server is configured in `vite.config.ts` to use:

```txt
http://127.0.0.1:5173/
```

Use `127.0.0.1`, not `localhost`, because Spotify redirect URI validation requires the exact origin you allowlist.

## Spotify Developer App

In the Spotify Developer Dashboard, add these redirect URIs:

```txt
http://127.0.0.1:5173/
https://timpham622.github.io/Spotify-Playlist-Ranker/
```

The redirect URI is generated from Vite's `BASE_URL`, so local dev resolves to `/` and production resolves to `/Spotify-Playlist-Ranker/`.

## GitHub Pages Deployment

This repo includes `.github/workflows/deploy.yml`, which builds the Vite app and deploys `dist` to GitHub Pages.

In GitHub:

1. Go to repository Settings.
2. Open Secrets and variables, then Actions.
3. Add a repository secret named `VITE_SPOTIFY_CLIENT_ID`.
4. Open Pages settings.
5. Set the source to GitHub Actions.
6. Push to `main` or run the deploy workflow manually.

The Spotify client ID is embedded in the frontend build. This is normal for PKCE-based browser apps; the app does not use a client secret.

## Spotify Troubleshooting

Use these redirect URIs in the Spotify Developer Dashboard:

```txt
http://127.0.0.1:5173/
https://timpham622.github.io/Spotify-Playlist-Ranker/
```

If the app is still in Spotify development mode, add every tester in the app's user management area. Go to the Spotify Developer Dashboard, open the app, open Settings, then Users Management, and add the user's Spotify account email.

After changing redirect URIs, scopes, or test-user access, log out of this app and log back in so Spotify issues a fresh token.

Spotify's current playlist items API can return `403 Forbidden` unless the signed-in user owns the playlist or is a collaborator. A playlist being public does not mean this development-mode app can read its items. For someone else's public playlist, copy the tracks into one of your own playlists and sort that copy.

To inspect a failed request, open the browser DevTools Network panel, retry loading the playlist, and check the Spotify request URL, status code, and JSON response body. Do not share bearer tokens, refresh tokens, client secrets, repository secrets, or request headers that contain `Authorization`.

## Changing The GitHub Pages Base Path

The default base path is in `vite.config.ts`:

```ts
const defaultGithubPagesBase = "/Spotify-Playlist-Ranker/";
```

Change that value if the repository name changes, or override it during a build:

```bash
VITE_BASE_PATH=/Some-Other-Repo/ npm run build
```

If the production URL changes, add the matching redirect URI in Spotify as well.

## Routing On GitHub Pages

The app uses `HashRouter` in `src/main.tsx`. GitHub Pages serves static files and cannot rewrite arbitrary routes back to `index.html`, so hash routing keeps routes after `#` in the browser and avoids 404s.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Important Storage Notes

Spotify auth tokens are stored under `spotify-bias-sorter:token`.

Sort progress is stored under `spotify-bias-sorter:sort-session` after every matchup click. The Start Over button clears the saved sort session.
