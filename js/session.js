/* Piano Quest — the rules of a run, kept free of any drawing code.
 *
 * PracticeSession: self-paced. The music waits for the right note.
 * BeatSession:     the Beat Challenge. Notes must land on the beat.
 */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};

  function matches(played, wanted, anyOctave) {
    return played === wanted || (anyOctave && (played - wanted) % 12 === 0);
  }

  function PracticeSession(parsed, opts) {
    const notes = parsed.notes;
    const anyOctave = !!(opts && opts.anyOctave);
    const slipped = new Set();
    this.total = notes.length;
    this.at = 0;            // index into notes of the note to play next
    this.combo = 0;
    this.bestCombo = 0;
    this.wrongPresses = 0;
    Object.defineProperty(this, 'slips', { get: () => slipped.size });
    Object.defineProperty(this, 'finished', { get: () => this.at >= notes.length });
    this.current = () => notes[this.at] || null;
    this.press = function (midi) {
      const note = notes[this.at];
      if (!note) return { type: 'ignored' };
      if (matches(midi, note.midi, anyOctave)) {
        const clean = !slipped.has(this.at);
        this.combo = clean ? this.combo + 1 : 0;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        this.at++;
        return { type: 'hit', note, clean, finished: this.at >= notes.length, next: notes[this.at] || null };
      }
      slipped.add(this.at);
      this.combo = 0;
      this.wrongPresses++;
      return { type: 'slip', note, direction: midi > note.midi ? 'high' : 'low' };
    };
  }

  function BeatSession(parsed, bpm, opts) {
    const notes = parsed.notes;
    const anyOctave = !!(opts && opts.anyOctave);
    const beatLen = 60 / bpm;
    // How far from the beat still counts, in seconds. Generous at slow tempos.
    const windowSec = Math.max(0.18, Math.min(0.3, 0.4 * beatLen));
    const judged = new Array(notes.length).fill(null);
    this.total = notes.length;
    this.hits = 0;
    this.perfects = 0;
    this.misses = 0;
    this.extras = 0;
    this.beatLen = beatLen;
    this.window = windowSec;
    this.endBeat = parsed.totalBeats;
    /* now: seconds since beat 0 of the music (negative during the count-in). */
    this.press = function (midi, now) {
      let best = -1, bestGap = Infinity;
      for (let i = 0; i < notes.length; i++) {
        if (judged[i]) continue;
        const gap = now - notes[i].start * beatLen;
        if (gap < -windowSec) break;
        if (Math.abs(gap) <= windowSec && matches(midi, notes[i].midi, anyOctave) && Math.abs(gap) < bestGap) { best = i; bestGap = Math.abs(gap); }
      }
      if (best < 0) { this.extras++; return { type: 'extra' }; }
      const gap = now - notes[best].start * beatLen;
      const quality = Math.abs(gap) <= 0.09 ? 'perfect' : gap < 0 ? 'early' : 'late';
      judged[best] = quality;
      this.hits++;
      if (quality === 'perfect') this.perfects++;
      return { type: 'hit', note: notes[best], quality };
    };
    /* Notes whose moment has passed unplayed. */
    this.sweep = function (now) {
      const missed = [];
      for (let i = 0; i < notes.length; i++) {
        if (judged[i]) continue;
        if (now - notes[i].start * beatLen > windowSec) { judged[i] = 'miss'; this.misses++; missed.push(notes[i]); }
        else break;
      }
      return missed;
    };
  }

  PA.PracticeSession = PracticeSession;
  PA.BeatSession = BeatSession;
  if (typeof module !== 'undefined' && module.exports) module.exports = { PracticeSession, BeatSession };
})(typeof window !== 'undefined' ? window : globalThis);
