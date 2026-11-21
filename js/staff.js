/* Piano Quest — notation. Draws one long treble staff as SVG and scrolls
 * it so the note to play sits on the "now" line. Clef, key signature and time
 * signature stay pinned on the left. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  const NS = 'http://www.w3.org/2000/svg';
  const E4_STEP = 30;              // staff position 0 is the bottom line, E4
  const STEM = 3.5;                // stem length in staff spaces
  const KEYSIG_POS = { Bb: 4, Eb: 7, 'F#': 8 };

  function ensureDefs() {
    if (document.getElementById('pa-glyph-defs')) return;
    const G = PA.GLYPHS;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('id', 'pa-glyph-defs');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = '<defs>' + Object.keys(G).map(k => '<path id="pa-' + k + '" d="' + G[k].d + '"/>').join('') + '</defs>';
    document.body.appendChild(svg);
  }

  const n2 = v => Math.round(v * 100) / 100;
  function use(name, x, y, sp, cls) {
    return '<use href="#pa-' + name + '" fill="currentColor"' + (cls ? ' class="' + cls + '"' : '') +
      ' transform="translate(' + n2(x) + ' ' + n2(y) + ') scale(' + sp + ')"/>';
  }

  /* Horizontal room a note takes: longer notes get more, but not in proportion. */
  function advance(dur, sp) { return sp * (2.3 + 2.7 * Math.sqrt(dur)); }

  function headerMarkup(world, time, sp, base, x0) {
    const G = PA.GLYPHS;
    let s = use('gClef', x0, base - sp, sp);
    let x = x0 + (G.gClef.w + 0.45) * sp;
    world.accidentals.forEach(a => {
      const glyph = a.indexOf('#') > 0 ? 'sharp' : 'flat';
      s += use(glyph, x, base - KEYSIG_POS[a] * sp / 2, sp);
      x += (G[glyph].w + 0.12) * sp;
    });
    if (time) {
      x += 0.45 * sp;
      s += use('ts' + time[0], x, base - 3 * sp, sp) + use('ts' + time[1], x, base - sp, sp);
      x += 1.9 * sp;
    }
    return { markup: s, width: x + 0.7 * sp };
  }

  function staffLines(x1, x2, sp, base) {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const y = base - i * sp;
      s += '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + y + '" y2="' + y + '"/>';
    }
    return '<g class="lines" stroke="currentColor" stroke-width="' + n2(sp * 0.085) + '">' + s + '</g>';
  }

  function ledgers(pos, cx, halfWidth, sp, base) {
    let s = '';
    for (let p = -2; p >= pos; p -= 2) s += ledger(p);
    for (let p = 10; p <= pos; p += 2) s += ledger(p);
    function ledger(p) {
      const y = base - p * sp / 2;
      return '<line x1="' + n2(cx - halfWidth) + '" x2="' + n2(cx + halfWidth) + '" y1="' + y + '" y2="' + y + '" stroke="currentColor" stroke-width="' + n2(sp * 0.13) + '"/>';
    }
    return s;
  }

  function Staff(svg, world, level, opts) {
    ensureDefs();
    const G = PA.GLYPHS;
    const o = Object.assign({ sp: 17, width: 992, height: 250, base: 156, nowX: 318, fingers: 'all', names: false }, opts);
    const sp = o.sp, base = o.base;
    const parsed = PA.Curriculum.parseLevel(level);
    const events = parsed.events;
    const yOf = step => base - (step - E4_STEP) * sp / 2;
    const stemW = sp * 0.12;

    // Horizontal layout.
    const barlines = [];
    let x = 0;
    events.forEach((ev, i) => {
      if (i > 0 && ev.bar !== events[i - 1].bar) { barlines.push(x + 0.1 * sp); x += 1.7 * sp; }
      ev.x = x;
      x += advance(ev.dur, sp);
    });
    const endX = x;

    // Pair up eighth notes that share a beat so they can be beamed.
    const beams = new Map();
    for (let i = 0; i + 1 < events.length; i++) {
      const a = events[i], b = events[i + 1];
      if (a.rest || b.rest || a.dur !== 0.5 || b.dur !== 0.5 || a.bar !== b.bar || a.start % 1 !== 0 || beams.has(i)) continue;
      const up = ((a.step - E4_STEP) + (b.step - E4_STEP)) / 2 < 4;
      const dir = up ? -1 : 1;
      const tipA = yOf(a.step) + dir * STEM * sp, tipB = yOf(b.step) + dir * STEM * sp;
      const outer = up ? Math.min(tipA, tipB) : Math.max(tipA, tipB);
      const slant = Math.max(-0.6 * sp, Math.min(0.6 * sp, tipB - tipA));
      // Keep the far stem full length; let the beam lean toward the other note.
      let endA, endB;
      if (up) { endA = slant >= 0 ? outer : outer - slant; endB = slant >= 0 ? outer + slant : outer; }
      else { endA = slant <= 0 ? outer : outer - slant; endB = slant <= 0 ? outer + slant : outer; }
      const beam = { up, a, b, endA, endB };
      beams.set(i, beam); beams.set(i + 1, beam);
      i++;
    }

    function noteMarkup(ev) {
      const pos = ev.step - E4_STEP, y = yOf(ev.step);
      const head = ev.dur >= 4 ? 'noteWhole' : ev.dur >= 2 ? 'noteHalf' : 'noteBlack';
      const hw = G[head].w * sp, hx = ev.x - hw / 2;
      let s = ledgers(pos, ev.x, hw / 2 + 0.38 * sp, sp, base) + use(head, hx, y, sp);
      const beam = beams.get(ev.index);
      if (ev.dur < 4) {
        const up = beam ? beam.up : pos < 4;
        const sx = up ? hx + hw - stemW : hx;
        const tip = beam ? (beam.a === ev ? beam.endA : beam.endB) : y + (up ? -1 : 1) * STEM * sp;
        const from = y + (up ? -0.17 : 0.17) * sp;
        s += '<rect x="' + n2(sx) + '" y="' + n2(Math.min(from, tip)) + '" width="' + n2(stemW) + '" height="' + n2(Math.abs(tip - from)) + '" fill="currentColor"/>';
        if (ev.dur === 0.5 && !beam) s += use(up ? 'flagUp' : 'flagDown', sx, tip, sp);
        if (beam && beam.a === ev) {
          const b = beam.b, bhw = G.noteBlack.w * sp;
          const bx = (beam.up ? b.x - bhw / 2 + bhw - stemW : b.x - bhw / 2) + stemW;
          const t = 0.5 * sp * (beam.up ? 1 : -1);
          s += '<polygon fill="currentColor" points="' + [sx, beam.endA, bx, beam.endB, bx, beam.endB + t, sx, beam.endA + t].map(n2).join(' ') + '"/>';
        }
      }
      if (ev.durCode === 'H' || ev.durCode === 'Q') {
        s += '<circle cx="' + n2(hx + hw + 0.55 * sp) + '" cy="' + n2(y - (pos % 2 === 0 ? sp / 2 : 0)) + '" r="' + n2(sp * 0.2) + '" fill="currentColor"/>';
      }
      const showFinger = ev.finger && (o.fingers === 'all' || (o.fingers === 'marked' && ev.fingerMarked));
      if (showFinger) s += '<text class="finger" x="' + n2(ev.x) + '" y="' + n2(base - 6.1 * sp) + '">' + ev.finger + '</text>';
      if (o.names) s += '<text class="name" x="' + n2(ev.x) + '" y="' + n2(base + 4.35 * sp) + '">' + ev.label + '</text>';
      return '<g class="n" data-i="' + ev.index + '">' + s + '</g>';
    }

    function restMarkup(ev) {
      const mid = base - 2 * sp;
      let s;
      if (ev.dur >= 4) s = use('restWhole', ev.x - 0.56 * sp, base - 3 * sp, sp);
      else if (ev.dur >= 2) s = use('restHalf', ev.x - 0.56 * sp, mid, sp);
      else s = use('restQuarter', ev.x - 0.54 * sp, mid, sp);
      return '<g class="r" data-i="' + ev.index + '">' + s + '</g>';
    }

    const top = base - 4 * sp;
    const barMarkup = barlines.map(bx => '<line x1="' + n2(bx) + '" x2="' + n2(bx) + '" y1="' + top + '" y2="' + base + '"/>').join('') +
      '<line x1="' + n2(endX) + '" x2="' + n2(endX) + '" y1="' + top + '" y2="' + base + '"/>' +
      '<line x1="' + n2(endX + 0.62 * sp) + '" x2="' + n2(endX + 0.62 * sp) + '" y1="' + top + '" y2="' + base + '" stroke-width="' + n2(sp * 0.42) + '"/>';
    const header = headerMarkup(world, level.time, sp, base, 0.8 * sp);
    const fadeW = 2.2 * sp;

    svg.setAttribute('viewBox', '0 0 ' + o.width + ' ' + o.height);
    svg.innerHTML =
      // Notes fade out as they slide under the clef and key signature.
      '<defs><linearGradient id="pa-fade" gradientUnits="userSpaceOnUse" x1="' + n2(header.width) + '" x2="' + n2(header.width + fadeW) + '" y1="0" y2="0">' +
      '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>' +
      '<mask id="pa-staff-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="' + o.width + '" height="' + o.height + '">' +
      '<rect x="' + n2(header.width) + '" y="0" width="' + n2(o.width - header.width) + '" height="' + o.height + '" fill="url(#pa-fade)"/></mask></defs>' +
      '<rect class="now-band" x="' + (o.nowX - 1.55 * sp) + '" y="' + n2(top - 3.7 * sp) + '" width="' + (3.1 * sp) + '" height="' + n2(12.7 * sp) + '" rx="' + (0.9 * sp) + '"/>' +
      staffLines(0, o.width, sp, base) +
      '<g mask="url(#pa-staff-mask)"><g class="scroll">' +
      '<g class="bars" stroke="currentColor" stroke-width="' + n2(sp * 0.1) + '">' + barMarkup + '</g>' +
      events.map(ev => ev.rest ? restMarkup(ev) : noteMarkup(ev)).join('') +
      '</g></g>' +
      '<line class="edge" x1="1" x2="1" y1="' + top + '" y2="' + base + '" stroke="currentColor" stroke-width="2"/>' +
      '<g class="header">' + header.markup + '</g>';

    const scrollEl = svg.querySelector('.scroll');
    const noteEls = new Map();
    svg.querySelectorAll('.n').forEach(el => noteEls.set(+el.getAttribute('data-i'), el));
    let pos = 0, target = 0;
    function apply() { scrollEl.setAttribute('transform', 'translate(' + n2(o.nowX - pos) + ' 0)'); }
    apply();

    const lead = advance(1, sp);
    this.parsed = parsed;
    this.events = events;
    this.endX = endX;
    /* Glide toward a music position (used when the player sets the pace). */
    this.scrollTo = function (xPos) { target = xPos; };
    /* Jump straight to a music position (used when the beat sets the pace). */
    this.jump = function (xPos) { pos = target = xPos; apply(); };
    this.update = function (dt) {
      if (Math.abs(target - pos) < 0.2) { if (pos !== target) { pos = target; apply(); } return; }
      pos += (target - pos) * (1 - Math.exp(-dt * 11));
      apply();
    };
    /* Music x-position of a beat, including the count-in before beat 0. */
    this.xAtBeat = function (beat) {
      if (beat <= 0) return beat * lead;
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (beat < ev.start + ev.dur) {
          const next = i + 1 < events.length ? events[i + 1].x : endX;
          return ev.x + (beat - ev.start) / ev.dur * (next - ev.x);
        }
      }
      return endX + (beat - parsed.totalBeats) * lead;
    };
    this.mark = function (index, state) {
      const el = noteEls.get(index);
      if (el) el.setAttribute('class', 'n' + (state ? ' ' + state : ''));
    };
    this.clearMarks = function () { noteEls.forEach(el => el.setAttribute('class', 'n')); };
  }

  /* A small staff showing just the clef and key signature (for the map). */
  Staff.keySignature = function (world, sp) {
    ensureDefs();
    const base = 6.2 * sp;
    const header = headerMarkup(world, null, sp, base, 0.5 * sp);
    const w = Math.max(header.width + 0.3 * sp, 6.6 * sp), h = 8.6 * sp;
    return '<svg class="keysig" viewBox="0 0 ' + n2(w) + ' ' + n2(h) + '" width="' + n2(w) + '" height="' + n2(h) + '" aria-hidden="true">' +
      staffLines(0, n2(w), sp, base) + header.markup + '</svg>';
  };

  /* A staff with one whole note, for Free Play. Black keys are written as sharps. */
  Staff.single = function (svg, midi, sp) {
    ensureDefs();
    const G = PA.GLYPHS;
    const W = 300, H = 230, base = 142;
    const world = { accidentals: [] };
    const header = headerMarkup(world, null, sp, base, 0.8 * sp);
    let s = staffLines(0, W, sp, base) + '<g class="header">' + header.markup + '</g>';
    if (midi != null) {
      const pc = midi % 12, octave = Math.floor(midi / 12) - 1;
      const sharp = [1, 3, 6, 8, 10].indexOf(pc) >= 0;
      const letterIdx = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][pc];
      const posn = octave * 7 + letterIdx - E4_STEP;
      const y = base - posn * sp / 2, cx = 205, hw = G.noteWhole.w * sp;
      s += '<g class="n done">' + ledgers(posn, cx, hw / 2 + 0.38 * sp, sp, base) + use('noteWhole', cx - hw / 2, y, sp) +
        (sharp ? use('sharp', cx - hw / 2 - 1.35 * sp, y, sp) : '') + '</g>';
    }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = s;
  };

  PA.Staff = Staff;
})(typeof window !== 'undefined' ? window : globalThis);
