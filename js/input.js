/* Piano Quest — ways to play: the on-screen keyboard (touch or mouse),
 * a MIDI keyboard, and the computer keyboard. All three feed PA.Input. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  const BLACK = [1, 3, 6, 8, 10];
  const isBlack = midi => BLACK.indexOf(midi % 12) >= 0;
  const WHITE_NAMES = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };
  const BLACK_NAMES = { Bb: [10, 'B♭'], Eb: [3, 'E♭'], 'F#': [6, 'F♯'] };

  /* One place every note arrives, whatever it was played on. */
  const Input = {
    onNoteOn: null, onNoteOff: null,
    noteOn(midi, velocity, source) { if (Input.onNoteOn) Input.onNoteOn(midi, velocity, source); },
    noteOff(midi, source) { if (Input.onNoteOff) Input.onNoteOff(midi, source); },
  };

  /* ---------- On-screen keyboard ---------- */
  function Keyboard(el, low, high) {
    const keys = new Map();
    const whites = [];
    for (let m = low; m <= high; m++) if (!isBlack(m)) whites.push(m);
    const w = 100 / whites.length, bw = w * 0.6;
    let html = '';
    whites.forEach((m, i) => {
      html += '<div class="key white' + (m === 60 ? ' middle-c' : '') + '" data-midi="' + m + '" style="left:' + (i * w) + '%;width:' + w + '%"><span class="fing"></span><span class="lbl"></span></div>';
    });
    for (let m = low; m <= high; m++) {
      if (!isBlack(m)) continue;
      const i = whites.indexOf(m + 1);
      html += '<div class="key black" data-midi="' + m + '" style="left:' + (i * w - bw / 2) + '%;width:' + bw + '%"><span class="fing"></span><span class="lbl"></span></div>';
    }
    el.innerHTML = html;
    el.querySelectorAll('.key').forEach(k => keys.set(+k.getAttribute('data-midi'), k));

    const pointers = new Map();
    el.addEventListener('pointerdown', e => {
      const k = e.target.closest('.key');
      if (!k) return;
      e.preventDefault();
      const midi = +k.getAttribute('data-midi');
      pointers.set(e.pointerId, midi);
      Input.noteOn(midi, 0.85, 'touch');
    });
    const lift = e => {
      if (!pointers.has(e.pointerId)) return;
      const midi = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      Input.noteOff(midi, 'touch');
    };
    root.addEventListener('pointerup', lift);
    root.addEventListener('pointercancel', lift);
    el.addEventListener('contextmenu', e => e.preventDefault());

    this.has = midi => keys.has(midi);
    /* Show a key going down. kind: 'ok', 'bad', 'demo' or '' (neutral). */
    this.down = function (midi, kind) {
      const k = keys.get(midi);
      if (!k) return;
      k.classList.remove('ok', 'bad', 'demo');
      k.classList.add('down');
      if (kind) k.classList.add(kind);
    };
    this.up = function (midi) {
      const k = keys.get(midi);
      if (k) k.classList.remove('down', 'ok', 'bad', 'demo');
    };
    this.allUp = function () { keys.forEach(k => k.classList.remove('down', 'ok', 'bad', 'demo')); };
    this.hint = function (midi) {
      keys.forEach(k => k.classList.remove('hint'));
      if (midi != null && keys.get(midi)) keys.get(midi).classList.add('hint');
    };
    this.setFingers = function (list) {
      keys.forEach(k => { k.classList.remove('fingered'); k.querySelector('.fing').textContent = ''; });
      (list || []).forEach(f => {
        const k = keys.get(f.midi);
        if (k) { k.classList.add('fingered'); k.querySelector('.fing').textContent = f.finger; }
      });
    };
    /* Letter names on the white keys, plus the black keys the key signature uses. */
    this.setLabels = function (world, show) {
      const named = {};
      (world ? world.accidentals : []).forEach(a => { named[BLACK_NAMES[a][0]] = BLACK_NAMES[a][1]; });
      keys.forEach((k, midi) => {
        const pc = midi % 12;
        k.querySelector('.lbl').textContent = !show ? '' : isBlack(midi) ? (named[pc] || '') : WHITE_NAMES[pc];
        k.classList.toggle('in-key', isBlack(midi) && !!named[pc]);
      });
    };
  }

  /* ---------- MIDI keyboards (Web MIDI) ---------- */
  const Midi = {
    status: 'unsupported',   // 'unsupported' | 'blocked' | 'waiting' | 'connected'
    devices: [],
    onChange: null,
    init() {
      if (!navigator.requestMIDIAccess) { Midi.changed(); return; }
      Midi.status = 'waiting';
      Midi.changed();
      navigator.requestMIDIAccess().then(access => {
        const hook = () => {
          Midi.devices = [];
          access.inputs.forEach(input => {
            if (input.state === 'disconnected') return;
            Midi.devices.push(input.name || 'MIDI keyboard');
            input.onmidimessage = Midi.message;
          });
          Midi.status = Midi.devices.length ? 'connected' : 'waiting';
          Midi.changed();
        };
        access.onstatechange = hook;
        hook();
      }).catch(() => { Midi.status = 'blocked'; Midi.changed(); });
    },
    message(e) {
      const d = e.data;
      if (!d || d.length < 2) return;
      const cmd = d[0] & 0xf0, note = d[1], vel = d.length > 2 ? d[2] : 0;
      if (cmd === 0x90 && vel > 0) Input.noteOn(note, 0.35 + 0.65 * vel / 127, 'midi');
      else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) Input.noteOff(note, 'midi');
    },
    changed() { if (Midi.onChange) Midi.onChange(); },
    label() {
      if (Midi.status === 'connected') return Midi.devices[0] + (Midi.devices.length > 1 ? ' +' + (Midi.devices.length - 1) : '');
      if (Midi.status === 'waiting') return 'No MIDI keyboard found';
      if (Midi.status === 'blocked') return 'MIDI access was not allowed';
      return 'MIDI is not available in this browser';
    },
  };

  /* ---------- Computer keyboard (handy at a desk) ---------- */
  const KEYMAP = {
    z: 57, x: 58, c: 59,
    a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71,
    k: 72, o: 73, l: 74, p: 75, ';': 76, "'": 77, ']': 78, '\\': 79,
  };
  function initComputerKeys() {
    const held = new Set();
    root.addEventListener('keydown', e => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const midi = KEYMAP[e.key.toLowerCase()];
      if (midi == null) return;
      e.preventDefault();
      held.add(midi);
      Input.noteOn(midi, 0.8, 'keys');
    });
    root.addEventListener('keyup', e => {
      const midi = KEYMAP[e.key.toLowerCase()];
      if (midi == null || !held.has(midi)) return;
      held.delete(midi);
      Input.noteOff(midi, 'keys');
    });
  }

  PA.Input = Input;
  PA.Keyboard = Keyboard;
  PA.Midi = Midi;
  PA.initComputerKeys = initComputerKeys;
  PA.isBlack = isBlack;
})(typeof window !== 'undefined' ? window : globalThis);
