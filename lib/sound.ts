/**
 * Shop sound: background music plus menu blips, all behind one on/off switch.
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

const BLIPS = {
  /** Cursor moved. */
  move: [[1319, 0.035]],
  /** Something picked. */
  select: [[988, 0.04], [1319, 0.06]],
  /** Switched section. */
  page: [[784, 0.04], [1047, 0.05]],
} satisfies Record<string, [number, number][]>;

/** A short menu blip, only while sound is on. */
export function blip(kind: keyof typeof BLIPS = "move") {
  if (!playing || !ctx) return;
  let at = ctx.currentTime;
  for (const [hz, length] of BLIPS[kind]) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = hz;
    env.gain.setValueAtTime(0.05, at);
    env.gain.exponentialRampToValueAtTime(0.001, at + length);
    osc.connect(env).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + length);
    at += length;
  }
}
