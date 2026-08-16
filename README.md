# Spotify Bias Sorter

A static, frontend-only React app for ranking a Spotify playlist through head-to-head matchups.

<img width="1637" height="900" alt="image" src="https://github.com/user-attachments/assets/d94b2759-52be-409a-abf7-c47ebea11f43" />


## Features

- Playlist support for tracks the logged-in user is allowed to read
- Spotify playlist URL, URI, or raw playlist ID parsing
- Approximate Fast top 10 with no ties
- Random subset ranking with ties
- Large-playlist pre-sort with estimated matchup counts
- Serializable merge-sort state machine
- Spotify track embeds in the active ranking cards


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

