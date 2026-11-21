// Checks every exercise: bars add up, notes stay in key and on the on-screen
// keyboard, fingerings are playable. Run with: node tools/validate.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../js/curriculum.js');

let problems = 0;
const fail = msg => { problems++; console.error('  ✗ ' + msg); };
const seen = new Set();

for (const world of C.WORLDS) {
  console.log(`${world.name} (${world.levels.length} levels)`);
  world.levels.forEach((level, i) => {
    if (seen.has(level.id)) fail(`${level.id}: duplicate id`);
    seen.add(level.id);
    let parsed;
    try { parsed = C.parseLevel(level); } catch (e) { fail(e.message); return; }
    const { notes, events } = parsed;
    if (!notes.length) fail(`${level.id}: no notes`);
    if (!notes[0].fingerMarked) fail(`${level.id}: first note needs a finger number`);
    for (const n of notes) {
      if (world.scale.indexOf(n.midi % 12) < 0) fail(`${level.id}: ${n.label}${n.octave} is outside ${world.name}`);
      if (n.midi < C.RANGE.low || n.midi > C.RANGE.high) fail(`${level.id}: ${n.label}${n.octave} is off the keyboard`);
      if (n.finger == null) fail(`${level.id}: ${n.label}${n.octave} in bar ${n.bar + 1} has no reachable finger`);
    }
    // Consecutive different notes should not share a finger, unless the second
    // one is marked on purpose (a hand-position change).
    for (let k = 1; k < notes.length; k++) {
      const a = notes[k - 1], b = notes[k];
      if (a.midi !== b.midi && a.finger === b.finger && !b.fingerMarked)fail(`${level.id}: finger ${a.finger} repeats on ${a.label} then ${b.label} (bar ${b.bar + 1})`);
    }
    const tonic = world.scale[0];
    const last = notes[notes.length - 1];
    if (last.midi % 12 !== tonic) fail(`${level.id}: does not end on the tonic`);
    for (const f of ['title', 'skill', 'tip', 'kind']) if (!level[f]) fail(`${level.id}: missing ${f}`);
    const rests = events.length - notes.length;
    console.log(`  ${String(i + 1).padStart(2)}. ${level.title.padEnd(32)} ${String(parsed.bars).padStart(2)} bars  ${String(notes.length).padStart(2)} notes${rests ? `  ${rests} rests` : ''}`);
  });
}
const total = C.WORLDS.reduce((n, w) => n + w.levels.length, 0);
console.log(problems ? `\n${problems} problem(s) found.` : `\nAll ${total} exercises are valid.`);
process.exit(problems ? 1 : 0);
