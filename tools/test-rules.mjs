// Tests for the game rules (no browser needed). Run with: node tools/test-rules.mjs
import assert from 'assert';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../js/curriculum.js');
const { PracticeSession, BeatSession } = require('../js/session.js');

const level = C.WORLDS[0].levels[0];
const parsed = C.parseLevel(level);
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('  ✓ ' + name); };

test('practice: a clean run has no slips and a full combo', () => {
  const s = new PracticeSession(parsed);
  parsed.notes.forEach(n => assert.equal(s.press(n.midi).type, 'hit'));
  assert.ok(s.finished);
  assert.equal(s.slips, 0);
  assert.equal(s.bestCombo, parsed.notes.length);
});

test('practice: the music waits on a wrong note and counts one slip per note', () => {
  const s = new PracticeSession(parsed);
  assert.equal(s.press(65).type, 'slip');
  assert.equal(s.press(67).direction, 'high');
  assert.equal(s.at, 0);
  const hit = s.press(parsed.notes[0].midi);
  assert.equal(hit.type, 'hit');
  assert.equal(hit.clean, false);
  assert.equal(s.slips, 1);
  assert.equal(s.wrongPresses, 2);
});

test('practice: "any octave" accepts the same note name elsewhere', () => {
  assert.equal(new PracticeSession(parsed).press(parsed.notes[0].midi + 12).type, 'slip');
  assert.equal(new PracticeSession(parsed, { anyOctave: true }).press(parsed.notes[0].midi + 12).type, 'hit');
});

test('beat: notes on the beat are hits, late ones are judged, silence is a miss', () => {
  const s = new BeatSession(parsed, 60);
  const [a, b, c] = parsed.notes;
  assert.equal(s.press(a.midi, a.start + 0.02).quality, 'perfect');
  assert.equal(s.press(b.midi, b.start + 0.2).quality, 'late');
  assert.equal(s.press(c.midi, c.start - 0.9).type, 'extra');
  assert.equal(s.sweep(c.start + 1).length, 1);
  assert.equal(s.hits, 2);
  assert.equal(s.extras, 1);
  assert.equal(s.misses, 1);
});

test('every exercise can be completed', () => {
  C.WORLDS.forEach(w => w.levels.forEach(l => {
    const p = C.parseLevel(l), s = new PracticeSession(p);
    p.notes.forEach(n => s.press(n.midi));
    assert.ok(s.finished, l.id);
    assert.ok(C.handPosition(l, w).length >= 4, l.id + ' hand position');
  }));
});

console.log(passed + ' rule tests passed.');
