/* Piano Quest — saved progress and the reward system.
 *
 * Progress is self-paced: nothing is ever lost and nothing times out.
 *   Stars   1 for finishing an exercise, 2 and 3 for cleaner playing.
 *   Crowns  from the optional Beat Challenge: bronze, silver, gold by tempo.
 *           Every timed run gets a percentage grade; 80% or more wins the crown.
 *   XP      for every finished run, with bonuses for new stars and crowns.
 *   Streak  days in a row with at least one finished exercise.
 *   Goal    three finished exercises a day.
 *   Badges  milestones across all of the above.
 */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  const KEY = 'piano-quest-save-v1';
  const DAILY_GOAL = 3;

  const RANKS = [
    [0, 'Curious Beginner'], [80, 'Key Finder'], [200, 'Step Walker'], [400, 'Melody Maker'],
    [700, 'Scale Climber'], [1100, 'Rhythm Ranger'], [1600, 'Tune Traveler'], [2300, 'Key Explorer'],
    [3200, 'Piano Voyager'], [4500, 'Maestro'],
  ];

  const BADGES = [
    { id: 'first', icon: '🎹', name: 'First Steps', how: 'Finish your first exercise.' },
    { id: 'flawless', icon: '✨', name: 'Clean Hands', how: 'Finish an exercise without a single slip.' },
    { id: 'combo30', icon: '🔥', name: 'On a Roll', how: 'Play 30 right notes in a row.' },
    { id: 'notes500', icon: '🎵', name: '500 Notes', how: 'Play 500 right notes in total.' },
    { id: 'notes2500', icon: '🎶', name: '2,500 Notes', how: 'Play 2,500 right notes in total.' },
    { id: 'world-C', icon: '🌅', name: 'Meadow Walker', how: 'Finish every exercise in C major.' },
    { id: 'world-F', icon: '🌿', name: 'Forest Ranger', how: 'Finish every exercise in F major.' },
    { id: 'world-G', icon: '🧊', name: 'Lake Skater', how: 'Finish every exercise in G major.' },
    { id: 'world-Bb', icon: '🏔️', name: 'Peak Climber', how: 'Finish every exercise in B♭ major.' },
    { id: 'grand', icon: '🗺️', name: 'Grand Tour', how: 'Finish all four keys.' },
    { id: 'stars-C', icon: '⭐', name: 'C Major Master', how: 'Earn three stars on every C major exercise.' },
    { id: 'stars-F', icon: '⭐', name: 'F Major Master', how: 'Earn three stars on every F major exercise.' },
    { id: 'stars-G', icon: '⭐', name: 'G Major Master', how: 'Earn three stars on every G major exercise.' },
    { id: 'stars-Bb', icon: '⭐', name: 'B♭ Major Master', how: 'Earn three stars on every B♭ major exercise.' },
    { id: 'scales', icon: '🪜', name: 'Scale Summit', how: 'Earn three stars on all four scale climbs.' },
    { id: 'crown1', icon: '👑', name: 'Steady Beat', how: 'Win your first crown in a Beat Challenge.' },
    { id: 'crown10', icon: '🥁', name: 'Crown Collector', how: 'Win crowns on 10 different exercises.' },
    { id: 'gold', icon: '🏆', name: 'Gold Tempo', how: 'Win a gold crown at the fast tempo.' },
    { id: 'streak3', icon: '📅', name: 'Three in a Row', how: 'Practice three days in a row.' },
    { id: 'streak7', icon: '🗓️', name: 'Full Week', how: 'Practice seven days in a row.' },
    { id: 'goal5', icon: '🎯', name: 'Goal Getter', how: 'Reach the daily goal on five days.' },
  ];

  function fresh() {
    return {
      v: 1, xp: 0, levels: {}, badges: {},
      streak: { count: 0, last: '' },
      daily: { date: '', done: 0 },
      stats: { notes: 0, runs: 0, goals: 0, bestCombo: 0 },
      settings: { volume: 0.8, keyLabels: true, noteNames: false, fingers: true, hints: 'mistake', anyOctave: false, midiSound: true, click: true },
      lastWorld: 0,
    };
  }

  let state = fresh();

  function load() {
    try {
      const raw = root.localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const base = fresh();
        state = Object.assign(base, saved);
        state.settings = Object.assign(fresh().settings, saved.settings || {});
        state.stats = Object.assign(fresh().stats, saved.stats || {});
        state.streak = Object.assign(fresh().streak, saved.streak || {});
        state.daily = Object.assign(fresh().daily, saved.daily || {});
      }
    } catch (e) { state = fresh(); }
    rollDay();
    return state;
  }

  function save() {
    try { root.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: play on without saving */ }
  }

  function reset() { state = fresh(); save(); }

  function dayString(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function today() { return dayString(new Date()); }
  function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return dayString(d); }

  /* Start a fresh daily count when the date changes; a missed day ends the streak. */
  function rollDay() {
    const t = today();
    if (state.daily.date !== t) state.daily = { date: t, done: 0 };
    if (state.streak.last && state.streak.last !== t && state.streak.last !== yesterday()) state.streak.count = 0;
  }

  function rec(id) {
    return state.levels[id] || { stars: 0, crown: 0, bestAcc: 0, plays: 0 };
  }
  function writeRec(id, r) { state.levels[id] = r; }

  const worlds = () => PA.Curriculum.WORLDS;
  function worldStars(w) { return w.levels.reduce((n, l) => n + rec(l.id).stars, 0); }
  function worldCrowns(w) { return w.levels.reduce((n, l) => n + (rec(l.id).crown ? 1 : 0), 0); }
  function worldDone(w) { return w.levels.every(l => rec(l.id).stars > 0); }
  function totalStars() { return worlds().reduce((n, w) => n + worldStars(w), 0); }
  function maxStars() { return worlds().reduce((n, w) => n + w.levels.length * 3, 0); }

  /* A key opens when the Key Quest (last exercise) of the key before it is finished. */
  function isWorldOpen(wi) {
    if (wi === 0) return true;
    const prev = worlds()[wi - 1];
    return rec(prev.levels[prev.levels.length - 1].id).stars > 0;
  }
  /* An exercise opens when the one before it has at least one star. */
  function isLevelOpen(wi, li) {
    if (!isWorldOpen(wi)) return false;
    if (li === 0) return true;
    return rec(worlds()[wi].levels[li - 1].id).stars > 0;
  }
  /* The first open exercise in a key that has no star yet (or -1). */
  function frontier(wi) {
    const w = worlds()[wi];
    if (!isWorldOpen(wi)) return -1;
    return w.levels.findIndex(l => rec(l.id).stars === 0);
  }

  function rank(xp) {
    const x = xp == null ? state.xp : xp;
    let i = 0;
    while (i + 1 < RANKS.length && x >= RANKS[i + 1][0]) i++;
    const floor = RANKS[i][0];
    const next = i + 1 < RANKS.length ? RANKS[i + 1][0] : null;
    return { index: i, number: i + 1, title: RANKS[i][1], floor, next, progress: next ? (x - floor) / (next - floor) : 1 };
  }

  function starsFor(noteCount, slips) {
    if (slips <= Math.ceil(noteCount * 0.05)) return 3;
    if (slips <= Math.ceil(noteCount * 0.2)) return 2;
    return 1;
  }

  function award(id, list) {
    if (state.badges[id]) return;
    state.badges[id] = today();
    list.push(BADGES.find(b => b.id === id));
  }

  /* Bookkeeping shared by every finished run: streak, daily goal, badge sweep. */
  function finishRun(parts, badges) {
    rollDay();
    const t = today();
    if (state.streak.last !== t) {
      state.streak.count = state.streak.last === yesterday() ? state.streak.count + 1 : 1;
      state.streak.last = t;
    }
    state.daily.done++;
    state.stats.runs++;
    let goalHit = false;
    if (state.daily.done === DAILY_GOAL) {
      goalHit = true;
      state.stats.goals++;
      parts.push({ label: 'Daily goal reached', xp: 25 });
    }
    award('first', badges);
    if (state.stats.notes >= 500) award('notes500', badges);
    if (state.stats.notes >= 2500) award('notes2500', badges);
    if (state.stats.bestCombo >= 30) award('combo30', badges);
    if (state.streak.count >= 3) award('streak3', badges);
    if (state.streak.count >= 7) award('streak7', badges);
    if (state.stats.goals >= 5) award('goal5', badges);
    let crowns = 0, gold = false;
    worlds().forEach(w => {
      if (worldDone(w)) award('world-' + w.id, badges);
      if (worldStars(w) === w.levels.length * 3) award('stars-' + w.id, badges);
      w.levels.forEach(l => { const r = rec(l.id); if (r.crown) crowns++; if (r.crown === 3) gold = true; });
    });
    if (worlds().every(worldDone)) award('grand', badges);
    if (worlds().every(w => w.levels.filter(l => l.kind === 'scale').every(l => rec(l.id).stars === 3))) award('scales', badges);
    if (crowns >= 1) award('crown1', badges);
    if (crowns >= 10) award('crown10', badges);
    if (gold) award('gold', badges);
    return goalHit;
  }

  function settle(parts, badges, extra) {
    const before = rank();
    const xp = parts.reduce((n, p) => n + p.xp, 0);
    state.xp += xp;
    const after = rank();
    save();
    return Object.assign({ xp, parts, badges, rankUp: after.index > before.index ? after : null }, extra);
  }

  /* Record a finished self-paced run. result: { notes, slips, bestCombo } */
  function commitPractice(wi, li, result) {
    const world = worlds()[wi], level = world.levels[li];
    const worldWasDone = worldDone(world);
    const r = Object.assign({}, rec(level.id));
    const stars = starsFor(result.notes, result.slips);
    const accuracy = result.notes ? (result.notes - result.slips) / result.notes : 0;
    const parts = [{ label: 'Exercise finished', xp: 10 + stars * 5 }];
    const newStars = Math.max(0, stars - r.stars);
    if (newStars) parts.push({ label: newStars === 1 ? 'New star' : newStars + ' new stars', xp: newStars * 20 });
    const firstClear = r.stars === 0;
    r.stars = Math.max(r.stars, stars);
    r.bestAcc = Math.max(r.bestAcc, accuracy);
    r.plays++;
    writeRec(level.id, r);
    state.stats.notes += result.notes;
    state.stats.bestCombo = Math.max(state.stats.bestCombo, result.bestCombo || 0);
    const badges = [];
    if (result.slips === 0) award('flawless', badges);
    const goalHit = finishRun(parts, badges);
    let opened = null;
    if (firstClear) {
      if (li + 1 < world.levels.length) opened = { type: 'level', wi, li: li + 1, name: world.levels[li + 1].title };
      else if (wi + 1 < worlds().length) opened = { type: 'world', wi: wi + 1, li: 0, name: worlds()[wi + 1].name };
    }
    if (!worldWasDone && worldDone(world)) parts.push({ label: world.name + ' complete', xp: 50 });
    return settle(parts, badges, { stars, newStars, accuracy, goalHit, opened, firstClear });
  }

  /* Record a finished Beat Challenge. result: { notes, hits, extras, tempo (1-3) } */
  function commitBeat(wi, li, result) {
    const level = worlds()[wi].levels[li];
    const r = Object.assign({}, rec(level.id));
    const score = result.notes ? Math.max(0, result.hits - 0.5 * result.extras) / result.notes : 0;
    const grade = Math.floor(score * 100 + 1e-9);   // the percentage shown to the player
    const won = score >= 0.8;
    const bestBefore = r.grade || 0;
    r.grade = Math.max(bestBefore, grade);
    const parts = [{ label: 'Beat Challenge played', xp: 10 }];
    let newCrown = 0;
    if (won && result.tempo > r.crown) {
      newCrown = result.tempo;
      parts.push({ label: ['', 'Bronze crown', 'Silver crown', 'Gold crown'][result.tempo], xp: 30 * (result.tempo - r.crown) });
      r.crown = result.tempo;
    }
    r.plays++;
    writeRec(level.id, r);
    state.stats.notes += result.hits;
    const badges = [];
    const goalHit = finishRun(parts, badges);
    return settle(parts, badges, { score, grade, bestGrade: r.grade, newBest: grade > bestBefore && bestBefore > 0, won, newCrown, crown: r.crown, goalHit });
  }

  PA.Store = {
    load, save, reset, rec, rank, today,
    worldStars, worldCrowns, worldDone, totalStars, maxStars,
    isWorldOpen, isLevelOpen, frontier, starsFor, commitPractice, commitBeat,
    BADGES, DAILY_GOAL,
    get state() { return state; },
    get settings() { return state.settings; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
