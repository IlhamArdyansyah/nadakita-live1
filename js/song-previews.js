/* Add supplied files here. Empty src keeps the player in its upcoming state. */
window.NADAKITA_SONG_PREVIEWS = {
  // Nama file tetap; pengguna menyediakan MP3 berizin dan boleh mengisi judul track.
  weeknd: { artist: 'The Weeknd', title: 'Moth To A Flame', src: 'assets/audio/the-weeknd.mp3' },
  bieber: { artist: 'Justin Bieber', title: 'DAISIES', src: 'assets/audio/justin-bieber.mp3' },
  bruno: { artist: 'Bruno Mars', title: 'Locked Out Of Heaven', src: 'assets/audio/bruno-mars.mp3' },
};
(() => {
  let audio;
  const time = seconds => {
    if (!Number.isFinite(seconds)) return '--:--';
    const whole = Math.floor(Math.max(0, seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  };
  const icons = {
    play: '<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
    sound:
      '<path d="M11 4 6 8H3v8h3l5 4V4Z" fill="currentColor" stroke="none"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    muted:
      '<path d="M11 4 6 8H3v8h3l5 4V4Z" fill="currentColor" stroke="none"/><path d="m16 9 6 6m0-6-6 6"/>',
  };
  const icon = name =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
  /** Player hanya dipasang pada detail artis; pemutaran dimulai lewat tombol Play. */
  const mount = () => {
    const host = document.getElementById('show-song-preview');
    if (!host || host.dataset.ready) return;
    const track = window.NADAKITA_SONG_PREVIEWS[host.dataset.songArtist];
    if (!track) return;
    host.dataset.ready = 'true';
    host.className = 'show-song-player';
    host.innerHTML = `<div class="song-preview-heading"><p class="preview-label">01 / SONG PREVIEW</p><span class="song-preview-artist"></span></div>
      <div class="song-preview-body">
        <div class="song-track-art" aria-hidden="true">♪</div>
        <div class="song-track-info"><p class="song-track-name"></p><p class="song-track-caption"></p></div>
        <div class="song-track-timeline"><input class="song-track-seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="Seek song preview" disabled><div class="song-track-times"><span class="song-track-elapsed">0:00</span><span class="song-track-duration">--:--</span></div></div>
        <button class="song-track-toggle" type="button" aria-label="Play song preview">${icon('play')}</button>
        <button class="song-track-mute" type="button" aria-label="Mute song preview" aria-pressed="false">${icon('sound')}</button>
        <audio preload="metadata" hidden></audio>
      </div><div class="song-track-footer"><p class="song-track-status" role="status"></p><button class="song-track-retry" type="button" hidden>RETRY AUDIO</button></div>`;
    host.querySelector('.song-preview-artist').textContent = track.artist;
    host.querySelector('.song-track-name').textContent = track.title || track.artist;
    host.querySelector('.song-track-caption').textContent = track.artist;
    const thumbnail = track.cover || host.dataset.songImage;
    if (thumbnail) {
      const image = document.createElement('img');
      image.src = thumbnail;
      image.alt = '';
      image.addEventListener('error', () => image.remove(), { once: true });
      host.querySelector('.song-track-art').append(image);
    }
    const status = host.querySelector('.song-track-status');
    const retry = host.querySelector('.song-track-retry');
    audio = host.querySelector('audio');
    const player = audio;
    const toggle = host.querySelector('.song-track-toggle');
    const mute = host.querySelector('.song-track-mute');
    const seek = host.querySelector('.song-track-seek');
    const sync = () => {
      const duration = Number.isFinite(player.duration) ? player.duration : 0;
      seek.disabled = !duration || !!player.error;
      seek.max = String(duration);
      seek.value = String(player.currentTime);
      seek.style.setProperty(
        '--song-progress',
        `${duration ? (player.currentTime / duration) * 100 : 0}%`
      );
      seek.setAttribute(
        'aria-valuetext',
        `${time(player.currentTime)} of ${time(player.duration)}`
      );
      host.querySelector('.song-track-elapsed').textContent = time(player.currentTime);
      host.querySelector('.song-track-duration').textContent = time(player.duration);
      toggle.innerHTML = icon(player.paused ? 'play' : 'pause');
      toggle.setAttribute('aria-label', player.paused ? 'Play song preview' : 'Pause song preview');
      mute.innerHTML = icon(player.muted ? 'muted' : 'sound');
      mute.setAttribute('aria-label', player.muted ? 'Unmute song preview' : 'Mute song preview');
      mute.setAttribute('aria-pressed', String(player.muted));
    };
    [
      'loadedmetadata',
      'canplay',
      'durationchange',
      'timeupdate',
      'play',
      'pause',
      'ended',
      'volumechange',
      'emptied',
    ].forEach(event => player.addEventListener(event, sync));
    seek.addEventListener('input', () => {
      if (Number.isFinite(player.duration)) player.currentTime = Number(seek.value);
      sync();
    });
    mute.addEventListener('click', () => {
      player.muted = !player.muted;
    });
    if (!track.src) {
      audio.hidden = true;
      toggle.disabled = true;
      mute.disabled = true;
      status.textContent = 'Song preview coming soon.';
      return;
    }
    audio.src = track.src;
    audio.addEventListener('error', () => {
      status.textContent = 'Audio unavailable. Try again later.';
      retry.hidden = false;
      sync();
    });
    const play = () =>
      audio.play().catch(() => {
        if (!audio.error) status.textContent = 'Press play to listen.';
      });
    toggle.addEventListener('click', () => {
      if (player.paused) play();
      else player.pause();
    });
    retry.addEventListener('click', () => {
      status.textContent = 'Loading audio…';
      retry.hidden = true;
      audio.load();
      play();
    });
    audio.addEventListener('play', () => {
      status.textContent = '';
      retry.hidden = true;
    });
  };
  window.addEventListener('nadakita:show-ready', mount);
  mount();
  window.addEventListener('pagehide', () => audio?.pause());
})();
