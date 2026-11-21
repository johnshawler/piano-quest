/* Piano Quest — sound. A small Web Audio piano plus the game's cues.
 * No samples: every sound is synthesised, so the game works offline. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};

  let ctx = null, master = null;
  let volume = 0.8;
  const voices = new Map();

  function ensure() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(comp);
    comp.connect(ctx.destination);
    // Lets sound play on iPad even when the side switch is set to silent.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* optional */ }
    return ctx;
  }

  /* Browsers only start audio after a touch or key press. */
  function unlock() {
    const c = ensure();
    if (c && c.state !== 'running') c.resume().catch(() => {});
  }

  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function noteOn(midi, velocity, when) {
    const c = ensure();
    if (!c) return;
    const t = Math.max(when || 0, c.currentTime);
    stopVoice(midi, t, 0.03);
    const f = freq(midi);
    const vel = Math.max(0.25, Math.min(1, velocity == null ? 0.8 : velocity));
    const out = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.6;
    filter.frequency.setValueAtTime(Math.min(9000, f * 9), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(700, f * 2.2), t + 0.9);
    const peak = 0.34 * vel;
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    out.gain.exponentialRampToValueAtTime(peak * 0.42, t + 0.28);
    out.gain.exponentialRampToValueAtTime(0.0008, t + 3.2);
    const oscs = [];
    [[1, 'triangle', 1], [2, 'sine', 0.36], [3, 'sine', 0.13], [4.01, 'sine', 0.05]].forEach(p => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = p[1];
      o.frequency.value = f * p[0];
      g.gain.value = p[2];
      o.connect(g); g.connect(filter);
      o.start(t); o.stop(t + 3.4);
      oscs.push(o);
    });
    filter.connect(out);
    out.connect(master);
    const voice = { out, oscs };
    voices.set(midi, voice);
    oscs[0].onended = () => { if (voices.get(midi) === voice) voices.delete(midi); try { out.disconnect(); } catch (e) { /* done */ } };
  }

  function stopVoice(midi, t, fade) {
    const v = voices.get(midi);
    if (!v) return;
    voices.delete(midi);
    try {
      v.out.gain.cancelScheduledValues(t);
      v.out.gain.setTargetAtTime(0.0001, t, fade);
      v.oscs.forEach(o => o.stop(t + fade * 8));
    } catch (e) { /* already stopped */ }
  }

  function noteOff(midi, when) {
    if (!ctx) return;
    stopVoice(midi, Math.max(when || 0, ctx.currentTime), 0.09);
  }

  function allOff() {
    if (!ctx) return;
    Array.from(voices.keys()).forEach(m => stopVoice(m, ctx.currentTime, 0.04));
  }

  function blip(f, when, dur, type, gain) {
    const c = ensure();
    if (!c) return;
    const t = Math.max(when || 0, c.currentTime);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /* Metronome tick; the first beat of the bar is higher. */
  function click(accent, when) { blip(accent ? 1760 : 1175, when, 0.05, 'square', accent ? 0.16 : 0.1); }

  /* A soft knock for a wrong key, quiet enough not to scold. */
  function thud() { blip(140, 0, 0.12, 'sine', 0.22); }

  function fanfare(stars) {
    const c = ensure();
    if (!c) return;
    const base = c.currentTime + 0.05;
    const seq = [[72, 0], [76, 0.11], [79, 0.22], [84, 0.36]].slice(0, 1 + Math.max(1, stars));
    seq.forEach(s => blip(freq(s[0]), base + s[1], 0.5, 'triangle', 0.2));
  }

  function sparkle(i) { blip(freq(84 + (i || 0) * 2), 0, 0.35, 'sine', 0.16); }

  function setVolume(v) {
    volume = v;
    if (master) master.gain.value = v;
  }

  PA.Audio = {
    unlock, noteOn, noteOff, allOff, click, thud, fanfare, sparkle, setVolume,
    now() { return ctx ? ctx.currentTime : 0; },
    ready() { return !!ctx && ctx.state === 'running'; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
