/**
 * Shop sound: background music behind an on/off switch, and the game's menu
 * sound whenever you do something.
 *
 * The music is "Shop" from Pokémon Emerald. The intro plays once, then the
 * main section repeats forever. The loop points come from matching the rip
 * against itself: the section repeats every 39.07 s and the two passes line up
 * best at this spot, so the jump back is inaudible.
 */

const TRACK = "/audio/emerald-shop.mp3";
const LOOP_START = 37.11;
const LOOP_END = LOOP_START + 39.0708;
const VOLUME = 0.35;

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let loading: Promise<void> | null = null;
let playing = false;

/** Call straight from the tap: browsers only let audio start inside a user gesture. */
export function startMusic(): Promise<void> {
  playing = true;
  if (!ctx || !gain) {
    ctx = new AudioContext();
    gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    // iOS mutes web audio with the ring/silent switch unless the page asks to play media.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
  }
  const context = ctx;
  void context.resume();
  gain.gain.cancelScheduledValues(context.currentTime);
  gain.gain.setTargetAtTime(VOLUME, context.currentTime, 0.08);

  loading ??= fetch(TRACK)
    .then((r) => {
      if (!r.ok) throw new Error(`Couldn't load ${TRACK} (${r.status})`);
      return r.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = LOOP_START;
      source.loopEnd = LOOP_END;
      source.connect(gain!);
      source.start();
    })
    .catch((error: unknown) => {
      loading = null;
      playing = false;
      throw error;
    });
  return loading;
}

/** Fades out and pauses, so turning it back on carries on from the same spot. */
export function stopMusic() {
  playing = false;
  if (!ctx || !gain) return;
  const context = ctx;
  gain.gain.cancelScheduledValues(context.currentTime);
  gain.gain.setTargetAtTime(0, context.currentTime, 0.06);
  setTimeout(() => {
    if (!playing) void context.suspend();
  }, 400);
}

/**
 * The menu sound is Emerald's SE_SELECT, which the game plays for every cursor
 * move, pick, cancel, pocket switch and message page. It's rendered from the
 * decomp's own sequence and voices by scripts/render-emerald-sfx.py.
 */
const SELECT = "/audio/se-select.wav";
// About as loud against the music as in the game.
const SFX_VOLUME = 0.55;

// The menu sound has its own context, so pausing the music doesn't silence it.
let sfx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let idle = 0;
let select: AudioBuffer | null = null;
let selectLoading: Promise<void> | null = null;
let selectPlaying: AudioBufferSourceNode | null = null;

function sfxContext() {
  // Browsers only let audio start from a tap, click or key press.
  if (!sfx && navigator.userActivation && !navigator.userActivation.isActive) return null;
  if (!sfx || !sfxGain) {
    sfx = new AudioContext();
    sfxGain = new GainNode(sfx, { gain: SFX_VOLUME });
    sfxGain.connect(sfx.destination);
  }
  if (sfx.state !== "running") sfx.resume().catch(() => {});
  // Let the audio hardware rest once the shop goes quiet.
  clearTimeout(idle);
  idle = window.setTimeout(() => void sfx?.suspend(), 30_000);
  return { audio: sfx, out: sfxGain };
}

/** Fetches the menu sound ahead of the first tap, so that one isn't silent. */
export function loadSounds() {
  // An offline context decodes it without waiting for a tap.
  selectLoading ??= fetch(SELECT)
    .then((r) => {
      if (!r.ok) throw new Error(`Couldn't load ${SELECT} (${r.status})`);
      return r.arrayBuffer();
    })
    .then((data) => new OfflineAudioContext(1, 1, 48000).decodeAudioData(data))
    .then((buffer) => {
      select = buffer;
    })
    .catch(() => {
      selectLoading = null;
    });
}

/** Emerald's menu sound. Call it from the tap, click or key press it answers. */
export function playSelectSound() {
  loadSounds();
  const context = sfxContext();
  if (!context || !select) return;
  // The game has one player for it, so a new one cuts off the last.
  selectPlaying?.stop();
  selectPlaying = new AudioBufferSourceNode(context.audio, { buffer: select });
  selectPlaying.connect(context.out);
  selectPlaying.start();
}
