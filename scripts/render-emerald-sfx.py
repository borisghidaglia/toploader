"""
Renders Pokémon Emerald's menu sound from the pokeemerald decompilation
(https://github.com/pret/pokeemerald), so the shop answers taps with the game's own sound.

    git clone --depth 1 https://github.com/pret/pokeemerald.git /tmp/pokeemerald
    python3 scripts/render-emerald-sfx.py /tmp/pokeemerald

Needs only the standard library. Writes public/audio/se-select.wav.

In the decomp a sound effect is a MIDI file, a line in midi.cfg (its voicegroup and
volume) and the voices it plays. Emerald plays it with its m4a sound engine: once a
frame, a sequencer steps through the notes and a driver writes the Game Boy sound
channels' registers (src/m4a_1.s, src/m4a.c). This does the same, then runs a model
of the square-wave channels on those writes. Square voices are all SE_SELECT uses,
so they're all this supports; anything else stops with an error.
"""

import math
import re
import struct
import sys
import wave
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/pokeemerald")
OUT = Path(__file__).resolve().parent.parent / "public/audio"

# The menu sound: Emerald plays SE_SELECT for every cursor move, pick, cancel,
# pocket switch and message page.
SOUNDS = ["se_select"]

CLOCK = 1 << 24  # GBA cycles a second
FRAME = 280896  # cycles from one VBlank to the next, when the engine runs
STEP = 16  # the square channels count in steps of 16 cycles
SEQUENCER = 32768  # the 512 Hz clock behind the envelope and sweep
RATE = 48000

# m4a_internal.h
SF_START, SF_STOP, SF_IEC, SF_ENV = 0x80, 0x40, 0x04, 0x03
SF_ON = SF_START | SF_STOP | SF_IEC | SF_ENV
ENV_ATTACK, ENV_DECAY, ENV_SUSTAIN, ENV_RELEASE = 3, 2, 1, 0
MO_VOL, MO_PIT = 0x01, 0x02
DIR_INC, DIR_DEC = 0x08, 0x00
TYPE_CGB, TYPE_FIX = 0x07, 0x08
VOLCHG, PITCHG = 0x03, 0x0C


def s8(v):
    v &= 0xFF
    return v - 256 if v >= 128 else v


# --- The song ---------------------------------------------------------------------


def read_midi(path):
    """A standard MIDI file as (ticks per beat, [[(tick, status, data)]]) per track."""
    data = path.read_bytes()
    assert data[:4] == b"MThd"
    _, count, division = struct.unpack(">HHH", data[8:14])
    pos, tracks = 14, []
    for _ in range(count):
        assert data[pos : pos + 4] == b"MTrk"
        end = pos + 8 + struct.unpack(">I", data[pos + 4 : pos + 8])[0]
        pos += 8
        tick, status, events = 0, 0, []

        def varlen():
            nonlocal pos
            value = 0
            while True:
                byte = data[pos]
                pos += 1
                value = (value << 7) | (byte & 0x7F)
                if byte < 0x80:
                    return value

        while pos < end:
            tick += varlen()
            if data[pos] & 0x80:
                status = data[pos]
                pos += 1
            if status == 0xFF:
                kind = data[pos]
                pos += 1
                size = varlen()
                events.append((tick, 0xFF, (kind, data[pos : pos + size])))
                pos += size
            elif status in (0xF0, 0xF7):
                pos += varlen()
            else:
                size = 1 if status & 0xF0 in (0xC0, 0xD0) else 2
                events.append((tick, status, tuple(data[pos : pos + size])))
                pos += size
        tracks.append(events)
    return division, tracks


def compile_song(name):
    """What mid2agb makes of the MIDI with the song's midi.cfg options: per track, a list
    of (tick, command, args) in m4a's 24 ticks a beat."""
    cfg = (SRC / "sound/songs/midi/midi.cfg").read_text()
    options = re.search(rf"^{name}\.mid:(.*)$", cfg, re.M).group(1).split()
    opt = {o[:2]: o[2:] for o in options}
    assert "-E" in opt, "only exact gate times (-E) are supported"
    master = int(opt.get("-V", "127"))
    division, tracks = read_midi(SRC / f"sound/songs/midi/{name}.mid")

    def at(tick):
        assert tick * 24 % division == 0
        return tick * 24 // division

    tempos = [(at(t), "tempo", (round(60_000_000 / int.from_bytes(d[1], "big")) // 2,)) for track in tracks for t, s, d in track if s == 0xFF and d[0] == 0x51]
    by_channel = {}
    for track in tracks:
        for t, status, d in track:
            if status != 0xFF:
                by_channel.setdefault(status & 0x0F, []).append((at(t), status & 0xF0, d))
    song = []
    for i, channel in enumerate(sorted(by_channel)):
        events = by_channel[channel]
        commands = list(tempos) if i == 0 else []
        for n, (t, kind, d) in enumerate(events):
            if kind == 0xC0:
                commands.append((t, "voice", (d[0],)))
            elif kind == 0xB0 and d[0] == 7:
                commands.append((t, "vol", (d[1] * master // 127,)))
            elif kind == 0xE0:
                commands.append((t, "bend", (d[1] - 64,)))
            elif kind == 0x90 and d[1]:
                end = next(u for u, k, e in events[n + 1 :] if e[0] == d[0] and (k == 0x80 or (k == 0x90 and not e[1])))
                assert end - t <= 96, "long notes (TIE) aren't supported"
                commands.append((t, "note", (d[0], d[1], end - t)))
            elif kind in (0x80, 0x90):
                pass
            else:
                raise ValueError(f"{name}: unsupported MIDI event {kind:#x} {d}")
        commands.sort(key=lambda c: c[0])  # stable: same-tick events keep their order
        end = max(u for u, k, e in events)
        commands.append((end, "fine", ()))
        song.append(commands)
    return song, opt.get("-G", "")[1:], int(opt.get("-P", "0"))


def read_voicegroup(name):
    voices = {}
    lines = (SRC / f"sound/voicegroups/{name}.inc").read_text().splitlines()
    head = re.match(r"\s*voice_group\s+\w+(?:\s*,\s*(\d+))?", lines[0])
    first = int(head.group(1) or 0)
    for i, line in enumerate(l for l in lines[1:] if l.strip()):
        macro, _, args = line.strip().partition(" ")
        values = [a.strip() for a in args.split(",")]
        if macro.startswith("voice_square_"):
            square = int(macro[13])
            alt = macro.endswith("_alt")
            key, pan = int(values[0]), int(values[1])
            sweep = int(values[2]) if square == 1 else 0
            duty, attack, decay, sustain, release = (int(v) for v in values[2 + (square == 1) :])
            voices[first + i] = {
                "type": square | (TYPE_FIX if alt else 0),
                "length": (0x80 | pan) if pan else 0,  # the macros put the pan in this byte
                "pan_sweep": sweep,
                "duty": duty & 3,
                "attack": attack & 7,
                "decay": decay & 7,
                "sustain": sustain & 15,
                "release": release & 7,
            }
        else:
            voices[first + i] = {"type": None, "macro": macro}
    return voices


# --- The m4a engine (src/m4a_1.s, src/m4a.c) ----------------------------------------


def read_c_table(name):
    body = re.search(rf"{name}\[\]\s*=\s*\{{(.*?)\}};", (SRC / "src/m4a_tables.c").read_text(), re.S).group(1)
    return [int(v, 0) for v in re.findall(r"-?(?:0x[0-9A-Fa-f]+|\d+)", body)]


class Channel:
    """One of m4a's CgbChannels, driving one Game Boy sound channel."""

    def __init__(self, number):
        self.number = number
        self.pan_mask = 0x11 << (number - 1)
        self.status = 0
        self.modify = 0
        self.envelope_volume = self.envelope_goal = self.envelope_counter = self.sustain_goal = 0
        self.echo_volume = self.echo_length = 0
        self.pan = self.n4 = self.frequency = 0
        self.track = None


class Track:
    def __init__(self, commands):
        self.commands = commands
        self.next = 0
        self.wait = 0
        self.exists = True
        self.flags = 0
        self.vol = self.pan = self.bend = self.key_shift = self.tune = 0
        self.vol_x, self.bend_range = 64, 2
        self.vol_right = self.vol_left = self.key_m = self.pit_m = 0
        self.voice = None


class Engine:
    def __init__(self, song, voices, priority, apu):
        self.voices = voices
        self.priority = priority
        self.apu = apu
        self.scale = read_c_table("gCgbScaleTable")
        self.freqs = read_c_table("gCgbFreqTable")
        self.tracks = [self.track_of(commands) for commands in song]
        self.channels = [Channel(n) for n in range(1, 5)]
        self.tempo_i, self.tempo_c = 150, 0  # MPlayStart
        self.c15 = 0  # as SoundInit leaves it
        self.playing = True

    @staticmethod
    def track_of(commands):
        # Turn absolute ticks into waits, as the assembled song has them.
        program, tick = [], 0
        for t, command, args in commands:
            if t > tick:
                program.append(("wait", (t - tick,)))
                tick = t
            program.append((command, args))
        return Track(program)

    def frame(self):
        if self.playing:
            self.tempo_c += self.tempo_i
            while self.tempo_c >= 150:
                self.tick()
                if not any(t.exists for t in self.tracks):
                    self.playing = False
                    break
                self.tempo_c -= 150
            for track in self.tracks:
                if track.exists and track.flags & (VOLCHG | PITCHG):
                    self.vol_pit_set(track)
                    for ch in self.channels:
                        if ch.track is track and ch.status & SF_ON:
                            if track.flags & VOLCHG:
                                self.set_volumes(ch, track)
                                ch.modify |= MO_VOL
                            if track.flags & PITCHG:
                                ch.frequency = self.cgb_frequency(ch.number, max(0, ch.key + track.key_m), track.pit_m)
                                ch.modify |= MO_PIT
                    track.flags &= 0xF0
        self.cgb_sound()

    def tick(self):
        for track in self.tracks:
            if not track.exists:
                continue
            for ch in self.channels:
                if ch.track is track and ch.status & SF_ON and ch.gate:
                    ch.gate -= 1
                    if not ch.gate:
                        ch.status |= SF_STOP
            while track.exists and track.wait == 0:
                command, args = track.commands[track.next]
                track.next += 1
                getattr(self, command)(track, *args)
            if track.exists:
                track.wait -= 1

    def wait(self, track, ticks):
        track.wait = ticks

    def tempo(self, track, value):
        self.tempo_i = value * 2

    def voice(self, track, number):
        track.voice = self.voices[number]

    def vol(self, track, value):
        track.vol = value
        track.flags |= VOLCHG

    def bend(self, track, value):
        track.bend = value
        track.flags |= PITCHG

    def fine(self, track):
        for ch in self.channels:
            if ch.track is track:
                if ch.status & SF_ON:
                    ch.status |= SF_STOP
                ch.track = None
        track.exists = False

    def vol_pit_set(self, track):  # TrkVolPitSet
        x = (track.vol * track.vol_x) >> 5
        y = max(-128, min(127, 2 * track.pan))
        track.vol_right = ((y + 128) * x) >> 8
        track.vol_left = ((127 - y) * x) >> 8
        x = (track.tune + track.bend * track.bend_range) * 4 + (track.key_shift << 8)
        track.key_m = x >> 8
        track.pit_m = x & 0xFF

    @staticmethod
    def set_volumes(ch, track):  # ChnVolSetAsm, with no rhythm pan
        ch.right = min(0xFF, (0x80 * ch.velocity * track.vol_right) >> 14)
        ch.left = min(0xFF, (0x7F * ch.velocity * track.vol_left) >> 14)

    def note(self, track, key, velocity, gate):  # ply_note
        voice = track.voice
        number = voice["type"] and voice["type"] & TYPE_CGB
        if not number or number > 2:
            raise ValueError(f"only square voices are supported, not {voice}")
        ch = self.channels[number - 1]
        priority = min(0xFF, self.priority)
        if ch.status & SF_ON and not ch.status & SF_STOP:
            if ch.priority > priority or (ch.priority == priority and ch.track is not track):
                return
        ch.track = track
        self.vol_pit_set(track)
        ch.gate = gate
        ch.priority = priority
        ch.key = key
        ch.velocity = velocity
        ch.type = voice["type"]
        ch.duty = voice["duty"]
        for field in ("attack", "decay", "sustain", "release"):
            setattr(ch, field, voice[field])
        ch.echo_volume = ch.echo_length = 0
        self.set_volumes(ch, track)
        ch.length = voice["length"]
        sweep = voice["pan_sweep"]
        ch.sweep = 8 if sweep & 0x80 or not sweep & 0x70 else sweep
        ch.frequency = self.cgb_frequency(number, max(0, key + track.key_m), track.pit_m)
        ch.status = SF_START
        track.flags &= 0xF0

    def cgb_frequency(self, number, key, fine):  # MidiKeyToCgbFreq, square channels
        if key <= 35:
            key, fine = 0, 0
        else:
            key -= 36
            if key > 130:
                key, fine = 130, 255

        def at(k):
            v = self.scale[k]
            return self.freqs[v & 0xF] >> (v >> 4)

        low, high = at(key), at(key + 1)
        return low + ((fine * (high - low)) >> 8) + 2048

    @staticmethod
    def mod_vol(ch):  # CgbModVol, in stereo
        right, left = ch.right, ch.left
        hard = right // 2 >= left if right >= left else left // 2 >= right
        ch.envelope_goal = ((left + right) & 0xFF) // 16  # summed into a u8
        if hard:
            ch.pan = 0x0F if right >= left else 0xF0
            ch.envelope_goal = min(15, ch.envelope_goal)
        else:
            ch.pan = 0xFF
        ch.sustain_goal = (ch.envelope_goal * ch.sustain + 15) >> 4
        ch.pan &= ch.pan_mask

    def cgb_sound(self):  # CgbSound, which is all gotos: `go` is the label to jump to
        apu = self.apu
        self.c15 = self.c15 - 1 if self.c15 else 14
        for ch in self.channels[:2]:
            if not ch.status & SF_ON:
                continue
            n = ch.number
            prev_c15 = self.c15
            env = apu.read(n, 2)
            if ch.status & SF_START:
                if ch.status & SF_STOP:
                    go = "oscillator_off"
                else:
                    ch.status = ENV_ATTACK
                    ch.modify = MO_PIT | MO_VOL
                    self.mod_vol(ch)
                    if n == 1:
                        apu.write(n, 0, ch.sweep)
                    apu.write(n, 1, ((ch.duty << 6) + ch.length) & 0xFF)
                    env = ch.attack + DIR_INC
                    ch.n4 = 0x40 if ch.length else 0x00
                    ch.envelope_counter = ch.attack
                    if ch.attack:
                        ch.envelope_volume = 0
                        go = "step_complete"
                    else:
                        go = "decay_start"
            elif ch.status & SF_IEC:
                ch.echo_length = (ch.echo_length - 1) & 0xFF
                go = "oscillator_off" if s8(ch.echo_length) <= 0 else "envelope_complete"
            elif ch.status & SF_STOP and ch.status & SF_ENV:
                ch.status &= ~SF_ENV
                ch.envelope_counter = ch.release
                if ch.release:
                    ch.modify |= MO_VOL
                    env = ch.release | DIR_DEC
                    go = "step_complete"
                else:
                    go = "pseudo_echo_start"
            else:
                go = "step_repeat"

            while go:
                if go == "step_repeat":
                    go = "step_complete"
                    if ch.envelope_counter == 0:
                        self.mod_vol(ch)
                        phase = ch.status & SF_ENV
                        if phase == ENV_RELEASE:
                            ch.envelope_volume = (ch.envelope_volume - 1) & 0xFF
                            if s8(ch.envelope_volume) <= 0:
                                go = "pseudo_echo_start"
                            else:
                                ch.envelope_counter = ch.release
                        elif phase == ENV_SUSTAIN:
                            go = "sustain"
                        elif phase == ENV_DECAY:
                            ch.envelope_volume = (ch.envelope_volume - 1) & 0xFF
                            if s8(ch.envelope_volume) <= s8(ch.sustain_goal):
                                go = "sustain_start"
                            else:
                                ch.envelope_counter = ch.decay
                        else:
                            ch.envelope_volume = (ch.envelope_volume + 1) & 0xFF
                            if ch.envelope_volume >= ch.envelope_goal:
                                go = "decay_start"
                            else:
                                ch.envelope_counter = ch.attack
                elif go == "decay_start":
                    ch.status -= 1
                    ch.envelope_counter = ch.decay
                    if ch.envelope_counter:
                        ch.modify |= MO_VOL
                        ch.envelope_volume = ch.envelope_goal
                        env = ch.decay | DIR_DEC
                        go = "step_complete"
                    else:
                        go = "sustain_start"
                elif go == "sustain_start":
                    if ch.sustain == 0:
                        ch.status &= ~SF_ENV
                        go = "pseudo_echo_start"
                    else:
                        ch.status -= 1
                        ch.modify |= MO_VOL
                        env = DIR_INC
                        go = "sustain"
                elif go == "sustain":
                    ch.envelope_volume = ch.sustain_goal
                    ch.envelope_counter = 7
                    go = "step_complete"
                elif go == "pseudo_echo_start":
                    ch.envelope_volume = (ch.envelope_goal * ch.echo_volume + 0xFF) >> 8
                    if ch.envelope_volume:
                        ch.status |= SF_IEC
                        ch.modify |= MO_VOL
                        env = DIR_INC
                        go = "envelope_complete"
                    else:
                        go = "oscillator_off"
                elif go == "step_complete":
                    # Every 15 frames the envelope steps twice, to keep up with the hardware's 64 Hz.
                    ch.envelope_counter = (ch.envelope_counter - 1) & 0xFF
                    if prev_c15 == 0:
                        prev_c15 -= 1
                        go = "step_repeat"
                    else:
                        go = "envelope_complete"
                elif go == "oscillator_off":  # CgbOscOff
                    apu.write(n, 2, 8)
                    apu.write(n, 4, 0x80)
                    ch.status = 0
                    go = None
                elif go == "envelope_complete":
                    if ch.modify & MO_PIT:
                        if ch.type & TYPE_FIX:
                            # The "_alt" voices round the pitch to suit the 65536 Hz output
                            # m4a sets in SOUNDBIAS.
                            ch.frequency = (ch.frequency + 1) & 0x7FE
                        apu.write(n, 3, ch.frequency & 0xFF)
                        ch.n4 = (ch.n4 & 0xC0) + ((ch.frequency >> 8) & 0xFF)
                        apu.write(n, 4, ch.n4)
                    if ch.modify & MO_VOL:
                        apu.nr51 = (apu.nr51 & ~ch.pan_mask) | ch.pan
                        apu.write(n, 2, (env & 0xF) + (ch.envelope_volume << 4))
                        apu.write(n, 4, ch.n4 | 0x80)
                        if n == 1 and not apu.read(1, 0) & 0x08:
                            apu.write(n, 4, ch.n4 | 0x80)
                    go = None
            ch.modify = 0

    @property
    def busy(self):
        return self.playing or any(ch.status & SF_ON for ch in self.channels)


# --- The Game Boy square channels -------------------------------------------------


DUTY = [
    [0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
]


class Square:
    def __init__(self, sweeps):
        self.sweeps = sweeps
        self.regs = [0] * 5
        self.on = False
        self.freq = self.timer = self.position = self.volume = self.envelope_timer = 0
        self.length, self.length_on = 64, False
        self.shadow = self.sweep_timer = 0
        self.sweep_on = False

    def write(self, reg, value):
        self.regs[reg] = value
        if reg == 1:
            self.length = 64 - (value & 63)
        elif reg == 2 and not value & 0xF8:
            self.on = False  # DAC off
        elif reg == 3:
            self.freq = (self.freq & 0x700) | value
        elif reg == 4:
            self.freq = (self.freq & 0xFF) | ((value & 7) << 8)
            self.length_on = bool(value & 0x40)
            if value & 0x80:
                self.trigger()

    def trigger(self):
        nr2 = self.regs[2]
        self.on = bool(nr2 & 0xF8)
        if self.length == 0:
            self.length = 64
        self.timer = 2048 - self.freq
        self.volume, self.envelope_timer = nr2 >> 4, nr2 & 7
        if self.sweeps:
            period, shift = (self.regs[0] >> 4) & 7, self.regs[0] & 7
            self.shadow = self.freq
            self.sweep_timer = period or 8
            self.sweep_on = bool(period or shift)
            if shift:
                self.swept()

    def swept(self):
        nr0 = self.regs[0]
        delta = self.shadow >> (nr0 & 7)
        freq = self.shadow - delta if nr0 & 8 else self.shadow + delta
        if freq > 2047:
            self.on = False
        return freq

    def clock_length(self):
        if self.length_on and self.length:
            self.length -= 1
            if not self.length:
                self.on = False

    def clock_sweep(self):
        if not self.sweeps:
            return
        self.sweep_timer -= 1
        if self.sweep_timer > 0:
            return
        period, shift = (self.regs[0] >> 4) & 7, self.regs[0] & 7
        self.sweep_timer = period or 8
        if self.sweep_on and period:
            freq = self.swept()
            if freq <= 2047 and shift:
                self.shadow = self.freq = freq
                self.swept()

    def clock_envelope(self):
        period = self.regs[2] & 7
        if not period:
            return
        self.envelope_timer -= 1
        if self.envelope_timer > 0:
            return
        self.envelope_timer = period
        if self.regs[2] & 8:
            self.volume = min(15, self.volume + 1)
        else:
            self.volume = max(0, self.volume - 1)

    def step(self):
        self.timer -= 1
        if self.timer <= 0:
            self.timer = 2048 - self.freq
            self.position = (self.position + 1) & 7

    def level(self):
        return self.volume if self.on and DUTY[self.regs[1] >> 6][self.position] else 0


class APU:
    def __init__(self):
        self.squares = [Square(True), Square(False)]
        self.nr51 = 0
        self.sequencer = 0

    def write(self, n, reg, value):
        if n == 2 and reg == 0:
            return  # square 2 has no sweep register
        self.squares[n - 1].write(reg, value)

    def read(self, n, reg):
        return self.squares[n - 1].regs[reg]

    def clock_sequencer(self):
        step = self.sequencer
        self.sequencer = (step + 1) & 7
        for sq in self.squares:
            if step % 2 == 0:
                sq.clock_length()
            if step in (2, 6):
                sq.clock_sweep()
            if step == 7:
                sq.clock_envelope()

    def level(self):
        # m4a sets NR50 to 0x77 (full volume, both sides); the mix is mono either way.
        right = sum(sq.level() for i, sq in enumerate(self.squares) if self.nr51 & (0x01 << i))
        left = sum(sq.level() for i, sq in enumerate(self.squares) if self.nr51 & (0x10 << i))
        return (left + right) / 2


# --- Rendering --------------------------------------------------------------------


def play(name):
    """The output level over time, as (step, level) wherever it changes."""
    song, group, priority = compile_song(name)
    apu = APU()
    engine = Engine(song, read_voicegroup(group), priority, apu)
    changes, last, step = [], 0, 0
    frame_steps, sequencer_steps = FRAME // STEP, SEQUENCER // STEP
    while engine.busy or step % frame_steps:
        if step % frame_steps == 0:
            engine.frame()
        if step % sequencer_steps == 0:
            apu.clock_sequencer()
        for sq in apu.squares:
            sq.step()
        level = apu.level()
        if level != last:
            changes.append((step, level))
            last = level
        step += 1
    return changes, step


def band_limited(changes, steps, tail=0.06):
    """Samples the stepped signal at RATE without aliasing: every step is drawn
    as a band-limited one (windowed sinc), the way emulators' blip buffers do."""
    width, fine = 16, 64
    cutoff = 20_000 / RATE

    def kernel(x):
        if abs(x) >= width:
            return 0.0
        sinc = 2 * cutoff * (math.sin(2 * math.pi * cutoff * x) / (2 * math.pi * cutoff * x) if x else 1.0)
        blackman = 0.42 + 0.5 * math.cos(math.pi * x / width) + 0.08 * math.cos(2 * math.pi * x / width)
        return sinc * blackman

    # The kernel's running integral: a band-limited step from 0 to 1.
    xs = [i / fine - width for i in range(2 * width * fine + 1)]
    integral, total = [0.0], 0.0
    for a, b in zip(xs, xs[1:]):
        total += (kernel(a) + kernel(b)) / 2 / fine
        integral.append(total)
    integral = [v / total for v in integral]

    def smooth_step(x):
        if x <= -width:
            return 0.0
        if x >= width:
            return 1.0
        i = (x + width) * fine
        j = min(int(i), len(integral) - 2)
        return integral[j] + (integral[j + 1] - integral[j]) * (i - j)

    count = math.ceil(steps * STEP / CLOCK * RATE + tail * RATE)
    out, diff, previous = [0.0] * count, [0.0] * (count + 1), 0.0
    for step, level in changes:
        at = step * STEP / CLOCK * RATE
        delta, previous = level - previous, level
        # The plain step, sampled...
        if math.ceil(at) < count:
            diff[math.ceil(at)] += delta
        # ...and around it, how a band-limited one differs from that.
        for n in range(max(0, math.ceil(at - width)), min(count, math.floor(at + width) + 1)):
            out[n] += delta * (smooth_step(n - at) - (n >= at))
    level = 0.0
    for n in range(count):
        level += diff[n]
        out[n] += level
    return out


def dc_block(samples, hz=15.0):
    """The output's coupling capacitor: the channels only ever add (0 to 15), so the
    signal sits above zero while a note plays."""
    r = 1 - 2 * math.pi * hz / RATE
    out, x1, y1 = [], 0.0, 0.0
    for x in samples:
        y1 = x - x1 + r * y1
        x1 = x
        out.append(y1)
    return out


def write_wav(path, samples, scale):
    path.parent.mkdir(parents=True, exist_ok=True)
    frames = struct.pack(f"<{len(samples)}h", *(max(-32768, min(32767, round(s * scale * 32767))) for s in samples))
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(frames)


def main():
    for name in SOUNDS:
        changes, steps = play(name)
        samples = dc_block(band_limited(changes, steps))
        # One channel at full volume (15) swings about half of the GBA's output range.
        path = OUT / f"{name.replace('_', '-')}.wav"
        write_wav(path, samples, 1 / 30)
        print(f"{path.relative_to(OUT.parent.parent)}: {len(samples) / RATE * 1000:.0f} ms, peak {max(map(abs, samples)) / 30:.2f}")


if __name__ == "__main__":
    main()
