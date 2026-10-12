# Artist song previews

Put the supplied audio files here. File paths are already configured in js/song-previews.js; optionally fill in each song title.

Recommended format: MP3, 30–60 seconds, 128–192 kbps.
File names:

- the-weeknd.mp3
- justin-bieber.mp3
- bruno-mars.mp3

Example configuration:

weeknd: {
  artist: 'The Weeknd',
  title: 'Your song title',
  src: 'assets/audio/the-weeknd.mp3'
}

All three MP3 files are currently present. Replace the matching file to change the audio. Use an empty
src if you prefer the "coming soon" state until the audio is ready. Both the artist photo and Discover
This Night open the concert detail page, where the player appears.
Playback starts only when the visitor presses Play; opening an artist does not autoplay.
Leaving the page stops playback.

The detail page uses a light player card with a song title, pink play/pause button,
seek bar, elapsed time, duration, and mute button. The underlying HTML audio element
provides the actual duration and playback state. The seek bar supports keyboard arrows.
Current titles in `js/song-previews.js` are "Moth To A Flame" (The Weeknd),
"DAISIES" (Justin Bieber), and "Locked Out Of Heaven" (Bruno Mars).
Edit `title` to change the displayed song name. The title appears above the artist
name, without an "Audio preview" suffix. Without a title, the player shows the artist name. An optional `cover`
path overrides the artist portrait thumbnail. Unavailable files show an English
message and Retry Audio.
