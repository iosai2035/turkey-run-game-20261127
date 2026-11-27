// All sound is synthesised live with the Web Audio API: no audio files, no network.
// A tiny voice kit (swept oscillator, filtered noise, musical notes) builds every
// effect, and a look-ahead step sequencer plays an original chiptune loop — a square
// lead, a triangle bass, a noise hat and a pitch-dropping kick — with a different song
// per screen. The audio clock, not the frame loop, times the notes.

import { MUTE_KEY } from './config.js';

/** Semitone steps of an A-minor-flavoured original melody, as MIDI note numbers. */
const SONG_TITLE = {
  bpm: 96,
  lead: [69, 0, 72, 76, 79, 76, 72, 0, 74, 0, 71, 74, 76, 0, 74, 71, 69, 0, 72, 76, 79, 76, 72, 0, 81, 79, 76, 74, 76, 0, 0, 0],
  bass: [45, 0, 0, 45, 0, 0, 52, 0, 50, 0, 0, 50, 0, 0, 48, 0, 45, 0, 0, 45, 0, 0, 52, 0, 50, 0, 48, 0, 47, 0, 48, 0],
  hats: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1],
};
const SONG_RUN = {
  bpm: 132,
  lead: [69, 72, 76, 72, 79, 76, 72, 76, 81, 79, 76, 72, 74, 76, 74, 71, 69, 72, 76, 72, 79, 76, 81, 79, 84, 81, 79, 76, 74, 76, 71, 0],
  bass: [45, 45, 52, 45, 50, 50, 48, 48, 45, 45, 52, 45, 57, 50, 48, 47, 45, 45, 52, 45, 50, 50, 48, 48, 57, 57, 50, 50, 48, 48, 47, 47],
  hats: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
};
const SONG_KITCHEN = {
  bpm: 152,
  lead: [69, 0, 69, 72, 76, 0, 75, 76, 79, 0, 79, 76, 75, 76, 74, 0, 69, 0, 69, 72, 76, 0, 75, 76, 81, 79, 76, 74, 76, 74, 71, 0],
  bass: [45, 45, 45, 0, 45, 0, 50, 0, 48, 48, 48, 0, 48, 0, 47, 0, 45, 45, 45, 0, 45, 0, 50, 0, 53, 53, 52, 52, 50, 50, 47, 47],
  hats: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
};
const SONGS = { title: SONG_TITLE, run: SONG_RUN, kitchen: SONG_KITCHEN };

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function createAudio() {
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    muted = false;
  }
  let songName = 'title';
  let step = 0;
  let nextStepTime = 0;
  let schedulerId = 0;
  const lastPlayed = new Map();

  function ensure() {
    if (context !== null) return true;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      return true;
    } catch {
      context = null;
      return false;
    }
  }

  /** The first user gesture must create/resume the context: browsers block sound before it. */
  function unlock() {
    if (!ensure()) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  function tone({ type = 'square', from = 440, to = 0, at = 0, dur = 0.15, vol = 0.2, attack = 0.005 }) {
    if (!context || muted) return;
    const t0 = context.currentTime + at;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, from), t0);
    if (to > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ at = 0, dur = 0.2, vol = 0.25, freq = 1200, type = 'bandpass', q = 1 }) {
    if (!context || muted) return;
    const t0 = context.currentTime + at;
    const src = context.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.05);
  }

  /** A named effect no more often than `gap` seconds, so repeated triggers stay musical. */
  function throttle(name, gap) {
    const now = context ? context.currentTime : 0;
    const last = lastPlayed.get(name) ?? -99;
    if (now - last < gap) return false;
    lastPlayed.set(name, now);
    return true;
  }

  function note(midi, at, dur, vol) {
    tone({ type: 'square', from: midiToFreq(midi), dur, vol, at });
  }

  function playStep(song, stepIndex, when) {
    const lead = song.lead[stepIndex % song.lead.length];
    const bass = song.bass[stepIndex % song.bass.length];
    const hat = song.hats[stepIndex % song.hats.length];
    const stepDur = 60 / song.bpm / 4;
    if (lead > 0) {
      // Lead: thin square wave, short envelope, a little quieter than the bass.
      const t0 = when;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(midiToFreq(lead), t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + stepDur * 0.92);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + stepDur);
    }
    if (bass > 0) {
      const t0 = when;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midiToFreq(bass), t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + stepDur * 0.95);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + stepDur);
    }
    if (hat) {
      const t0 = when;
      const src = context.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.05, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(t0, Math.random());
      src.stop(t0 + 0.05);
    }
    if (stepIndex % 4 === 0) {
      // Kick on the beat: a sine that drops from 150 Hz to 42 Hz.
      const t0 = when;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t0);
      osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.12);
      gain.gain.setValueAtTime(0.22, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.16);
    }
  }

  function scheduleAhead() {
    if (!context || muted) return;
    const song = SONGS[songName];
    const stepDur = 60 / song.bpm / 4;
    if (nextStepTime < context.currentTime - 0.05) {
      nextStepTime = context.currentTime + 0.05;
    }
    while (nextStepTime < context.currentTime + 0.15) {
      playStep(song, step, nextStepTime);
      step += 1;
      nextStepTime += stepDur;
    }
  }

  function startMusic(name) {
    if (songName !== name) {
      songName = name;
      step = 0;
      if (context) nextStepTime = context.currentTime + 0.06;
    }
    if (!ensure()) return;
    if (schedulerId === 0) {
      schedulerId = window.setInterval(scheduleAhead, 40);
    }
    unlock();
  }

  function stopMusic() {
    if (schedulerId !== 0) {
      window.clearInterval(schedulerId);
      schedulerId = 0;
    }
  }

  return {
    unlock,
    startMusic,
    stopMusic,
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      try {
        window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      } catch {
        // Storage off: the choice lasts this visit only.
      }
      if (master && context) master.gain.setTargetAtTime(muted ? 0 : 0.5, context.currentTime, 0.02);
      return muted;
    },
    click() {
      unlock();
      tone({ type: 'sine', from: 660, to: 880, dur: 0.07, vol: 0.15 });
    },
    jump(first) {
      if (!ensure() || !throttle('jump', 0.08)) return;
      tone({ type: 'square', from: first ? 280 : 380, to: first ? 720 : 980, dur: 0.16, vol: 0.14 });
    },
    land() {
      if (!ensure() || !throttle('land', 0.1)) return;
      noise({ dur: 0.09, vol: 0.16, freq: 300, type: 'lowpass' });
      tone({ type: 'sine', from: 130, to: 60, dur: 0.1, vol: 0.18 });
    },
    corn() {
      if (!ensure() || !throttle('corn', 0.05)) return;
      const jitter = 1 + (Math.random() - 0.5) * 0.06;
      tone({ type: 'sine', from: 880 * jitter, dur: 0.07, vol: 0.16 });
      tone({ type: 'sine', from: 1318 * jitter, at: 0.06, dur: 0.1, vol: 0.16 });
    },
    feather() {
      if (!ensure()) return;
      [880, 1108, 1318, 1760].forEach((f, i) => tone({ type: 'triangle', from: f, at: i * 0.06, dur: 0.12, vol: 0.16 }));
    },
    life() {
      if (!ensure()) return;
      [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'sine', from: f, at: i * 0.09, dur: 0.16, vol: 0.16 }));
    },
    hit() {
      if (!ensure()) return;
      noise({ dur: 0.25, vol: 0.3, freq: 900, type: 'lowpass' });
      tone({ type: 'sawtooth', from: 220, to: 55, dur: 0.3, vol: 0.22 });
      tone({ type: 'sine', from: 90, to: 40, dur: 0.3, vol: 0.25 });
    },
    spotted() {
      if (!ensure() || !throttle('spotted', 1.5)) return;
      tone({ type: 'sawtooth', from: 190, to: 120, dur: 0.28, vol: 0.16 });
      tone({ type: 'sawtooth', from: 240, to: 150, at: 0.05, dur: 0.22, vol: 0.1 });
    },
    heartbeat() {
      if (!ensure() || !throttle('heart', 0.45)) return;
      tone({ type: 'sine', from: 70, to: 45, dur: 0.12, vol: 0.22 });
      tone({ type: 'sine', from: 65, to: 42, at: 0.16, dur: 0.1, vol: 0.18 });
    },
    stage() {
      if (!ensure()) return;
      [523, 659, 784].forEach((f, i) => note(Math.round(69 + 12 * Math.log2(f / 440)), i * 0.1, 0.22, 0.14));
    },
    caught() {
      if (!ensure()) return;
      [392, 370, 349, 311].forEach((f, i) => tone({ type: 'sawtooth', from: f, at: i * 0.22, dur: 0.26, vol: 0.16 }));
      noise({ at: 0.8, dur: 0.5, vol: 0.2, freq: 500, type: 'lowpass' });
    },
    escaped() {
      if (!ensure()) return;
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone({ type: 'triangle', from: f, at: i * 0.11, dur: 0.22, vol: 0.18 }));
    },
  };
}
