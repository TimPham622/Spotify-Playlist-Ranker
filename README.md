# Spotify Bias Sorter

A static, frontend-only React app for ranking a Spotify playlist through head-to-head matchups. It uses Spotify Authorization Code with PKCE, fetches playlist tracks directly from the Spotify Web API, and stores sorting progress in `localStorage` so a refresh does not wipe out an in-progress ranking.

## Features

- Spotify PKCE login with `playlist-read-private`
- Playlist support for tracks the logged-in user is allowed to read
- Spotify playlist URL, URI, or raw playlist ID parsing
- Local file, podcast, and unavailable item filtering
- Full ranking with ties
- Approximate Fast top 10 with no ties
- Random subset ranking with ties
- Large-playlist pre-sort with estimated matchup counts
- Random subset sorting for click reduction
- Serializable merge-sort state machine
- Tie grouping, including shared final ranks like `1, 2, 2, 4`
- Spotify track embeds in the active ranking cards
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

## Ranking Modes

Full ranking uses every valid song and fully sorts the playlist with head-to-head merge-sort comparisons. The Tie option is available, and tied songs share the same final rank.

Fast top 10 uses every valid song but only estimates the top results. For playlists with more than 20 songs, it first runs a two-loss qualification round: songs are compared head-to-head, the loser receives a loss, and a song is eliminated after two losses. When 20 candidates remain, the app fully ranks those finalists without ties and displays the top 10. For playlists with 20 songs or fewer, Fast mode skips qualification and ranks the whole set without ties. Fast mode returns 10 songs when possible and all songs when fewer than 10 sortable songs exist.

Random subset picks the requested number of songs at random, then fully ranks that subset. The Tie option is available, and tied songs share ranks.

Fast top 10 is intentionally approximate. It can produce different results from a full ranking because strong songs can be eliminated during qualification after two unfavorable matchups.

## Spotify Embeds

The active Song A and Song B ranking cards use Spotify track embeds instead of Spotify's deprecated or often-unavailable `preview_url` audio previews. Each card embeds:

```txt
https://open.spotify.com/embed/track/{spotifyTrackId}
```

The app does not use the Spotify Web Playback SDK, playback OAuth scopes, a backend, a client secret, autoplay, or scraped audio URLs.

Spotify embeds require network access to Spotify and can be affected by browser privacy settings, content blockers, regional Spotify availability, and whether the user can play the track through Spotify. The app's Spotify authentication and development-mode playlist restrictions still apply.

## Manual Verification

This repo currently has no test script or test framework. The sorting logic is kept in pure functions in `src/lib/sortingEngine.ts`, the playlist item parser is isolated in `src/lib/spotifyPlaylist.ts`, and the embed URL builder is isolated in `src/lib/spotifyEmbeds.ts` so focused tests can be added later.

Manual checks to run after changes:

1. Load a valid playlist.
2. Confirm the setup screen shows Full ranking, Fast top 10, and Random subset.
3. Start Full ranking and confirm Song A, Tie, and Song B appear.
4. Start Fast top 10 and confirm only Song A and Song B appear.
5. Confirm each ranking card shows a Spotify embed and Open in Spotify link.
6. Confirm no separate large album artwork appears on the two ranking cards.
7. Confirm playlist artwork still appears before sorting.
8. Confirm album artwork still appears in final results.
9. Refresh during Fast qualification and confirm the session resumes.
10. Complete Fast mode with more than 20 songs and confirm exactly 10 results.
11. Complete Fast mode with fewer than 10 songs and confirm all songs appear.
12. Confirm GitHub Pages asset paths and routing still work.
