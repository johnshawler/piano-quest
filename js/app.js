/* Piano Quest — screens and game flow. */
(function () {
  'use strict';
  const PA = window.PA;
  const C = PA.Curriculum, Store = PA.Store, Audio = PA.Audio, Input = PA.Input, Midi = PA.Midi;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const now = () => performance.now() / 1000;

  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>';
  const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18v2.5H3zM3 16 2 7l5.5 4L12 4l4.5 7L22 7l-1 9z"/></svg>';
  const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.5A1.5 1.5 0 0 1 20 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10zm2.2 0h5.6V7a2.8 2.8 0 0 0-5.6 0z"/></svg>';
  const KIND = { exercise: 'Exercise', song: 'Tune', scale: 'Scale', quest: 'Key Quest' };
  const TEMPO = [null, { bpm: 56, name: 'Slow', crown: 'Bronze' }, { bpm: 72, name: 'Steady', crown: 'Silver' }, { bpm: 92, name: 'Quick', crown: 'Gold' }];
  const PITCH_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const PITCH_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const NUMBER_WORDS = { 5: 'Five', 10: 'Ten', 20: 'Twenty', 30: 'Thirty', 40: 'Forty' };

  const stage = $('#stage');
  let screen = 'map';
  let worldIndex = 0;
  let playKeys, freeKeys;

  /* ---------- Fit the 1024 x 768 stage to the screen ---------- */
  function fit() {
    const box = $('#fit');
    const s = Math.min(box.clientWidth / 1024, box.clientHeight / 768);
    stage.style.transform = 'translate(-50%, -50%) scale(' + (s > 0 ? s : 1) + ')';
  }

  function show(name) {
    screen = name;
    ['map', 'play', 'free'].forEach(n => { $('#screen-' + n).hidden = n !== name; });
    wakeLock(name !== 'map');
  }

  function setWorldColors(world) {
    stage.style.setProperty('--world', world.color);
    stage.style.setProperty('--world-tint', world.tint);
  }

  /* Keep the iPad awake while playing from a MIDI keyboard (no screen touches). */
  let wake = null;
  function wakeLock(on) {
    try {
      if (on && !wake && navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wake = w; w.addEventListener('release', () => { wake = null; }); }).catch(() => {});
      if (!on && wake) { wake.release().catch(() => {}); wake = null; }
    } catch (e) { /* optional */ }
  }

  /* ---------- Toast ---------- */
  let toastTimer = 0;
  function toast(text, low) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.toggle('low', !!low);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  /* ---------- Modal ---------- */
  let modalDismissable = true;
  function openModal(html, opts) {
    const m = $('#modal');
    m.className = 'modal' + (opts && opts.wide ? ' wide' : '');
    m.innerHTML = html;
    m.scrollTop = 0;
    modalDismissable = !(opts && opts.sticky);
    $('#overlay').hidden = false;
  }
  function closeModal() { $('#overlay').hidden = true; $('#modal').innerHTML = ''; }
  const modalOpen = () => !$('#overlay').hidden;

  /* ================= Map ================= */
  function renderMap() {
    const world = C.WORLDS[worldIndex];
    setWorldColors(world);
    renderTop();
    renderWorlds();
    renderTrail();
  }

  function renderTop() {
    const st = Store.state, r = Store.rank();
    $('#rank').innerHTML =
      '<div class="rank-num" title="Rank">' + r.number + '</div><div class="rank-body"><div class="rank-title">' + esc(r.title) + '</div>' +
      '<div class="xpbar"><i style="width:' + Math.round(r.progress * 100) + '%"></i></div>' +
      '<small>' + (r.next ? st.xp + ' / ' + r.next + ' XP' : st.xp + ' XP · top rank') + '</small></div>';
    const playedToday = st.streak.last === Store.today();
    const goalMet = st.daily.done >= Store.DAILY_GOAL;
    $('#stats').innerHTML =
      '<div class="stat' + (playedToday ? ' lit' : '') + '"><b>' + st.streak.count + '</b><small>day streak</small></div>' +
      '<div class="stat' + (goalMet ? ' met' : '') + '"><b>' + Math.min(st.daily.done, Store.DAILY_GOAL) + '/' + Store.DAILY_GOAL + '</b><small>today</small></div>' +
      '<div class="stat"><b>' + Store.totalStars() + '</b><small>stars</small></div>';
  }

  function renderWorlds() {
    $('#worlds').innerHTML = C.WORLDS.map((w, wi) => {
      const open = Store.isWorldOpen(wi);
      const crowns = Store.worldCrowns(w);
      let tally;
      if (open) tally = '<span class="star">★</span> ' + Store.worldStars(w) + '/' + (w.levels.length * 3) + (crowns ? ' &nbsp;·&nbsp; ' + crowns + (crowns === 1 ? ' crown' : ' crowns') : '');
      else { const prev = C.WORLDS[wi - 1]; tally = 'Opens after “' + esc(prev.levels[prev.levels.length - 1].title) + '”'; }
      return '<button class="world-tab' + (wi === worldIndex ? ' selected' : '') + (open ? '' : ' locked') + '" data-wi="' + wi + '" style="--world:' + w.color + ';--world-tint:' + w.tint + '">' +
        PA.Staff.keySignature(w, 7.2) +
        '<div><h3>' + esc(w.name) + '</h3><div class="land">' + esc(w.land) + '</div><div class="tally">' + tally + '</div></div></button>';
    }).join('');
  }

  function nodePoints(count) {
    const perRow = Math.ceil(count / 2), gap = 800 / (perRow - 1);
    const pts = [];
    for (let i = 0; i < count; i++) {
      pts.push(i < perRow ? { x: 112 + i * gap, y: 180 } : { x: 912 - (i - perRow) * gap, y: 412 });
    }
    return pts;
  }

  function renderTrail() {
    const world = C.WORLDS[worldIndex];
    const pts = nodePoints(world.levels.length);
    const perRow = Math.ceil(world.levels.length / 2);
    const a = pts[0], b = pts[perRow - 1], c = pts[perRow], d = pts[pts.length - 1];
    const path = 'M' + a.x + ' ' + a.y + ' L' + b.x + ' ' + b.y + ' C' + (b.x + 130) + ' ' + b.y + ' ' + (c.x + 130) + ' ' + c.y + ' ' + c.x + ' ' + c.y + ' L' + d.x + ' ' + d.y;
    const front = Store.frontier(worldIndex);
    const nodes = world.levels.map((level, li) => {
      const open = Store.isLevelOpen(worldIndex, li), r = Store.rec(level.id);
      const cls = !open ? 'locked' : r.stars ? 'done' : '';
      const stars = [1, 2, 3].map(n => '<span' + (r.stars >= n ? ' class="got"' : '') + '>★</span>').join('');
      return '<button class="node ' + cls + (li === front ? ' next' : '') + '" data-li="' + li + '" style="left:' + pts[li].x + 'px;top:' + pts[li].y + 'px" aria-label="' + esc(level.title) + (open ? '' : ' (locked)') + '">' +
        '<span class="node-kind">' + KIND[level.kind] + '</span>' +
        '<span class="node-disc">' + (open ? li + 1 : LOCK) + (r.crown ? '<span class="crown c' + r.crown + '">' + CROWN + '</span>' : '') + '</span>' +
        '<span class="node-title">' + esc(level.title) + '</span>' +
        '<span class="node-stars">' + stars + '</span></button>';
    }).join('');
    $('#trail').innerHTML =
      '<div class="trail-head"><h2>' + esc(world.land) + '</h2><p>' + esc(world.name) + '. ' + esc(world.blurb) + '</p></div>' +
      '<svg class="trail-path" viewBox="0 0 1024 560" aria-hidden="true"><path class="road" d="' + path + '"/><path class="dash" d="' + path + '"/></svg>' + nodes;
  }

  function onWorldTab(wi) {
    worldIndex = wi;
    Store.state.lastWorld = wi;
    Store.save();
    renderMap();
  }

  function onNode(li, el) {
    Audio.unlock();
    if (Store.isLevelOpen(worldIndex, li)) { openLevel(worldIndex, li); return; }
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    if (!Store.isWorldOpen(worldIndex)) {
      const prev = C.WORLDS[worldIndex - 1];
      toast('Finish “' + prev.levels[prev.levels.length - 1].title + '” in ' + prev.name + ' to open this key.', true);
    } else {
      toast('Finish “' + C.WORLDS[worldIndex].levels[li - 1].title + '” first.', true);
    }
  }

  /* ================= Play ================= */
  const play = { wi: 0, li: 0, world: null, level: null, staff: null, mode: 'practice', session: null, beat: null, listen: null, started: false };

  function pitchName(midi, world) {
    const flats = world.accidentals.some(a => a.indexOf('b') > 0);
    return (flats ? PITCH_FLAT : PITCH_SHARP)[midi % 12];
  }

  function coach(text, tone) {
    const el = $('#coach');
    el.textContent = text;
    el.className = 'coach' + (tone ? ' ' + tone : '');
  }

  function verdict(text, off) {
    const el = $('#verdict');
    el.textContent = text;
    el.className = 'verdict' + (off ? ' off' : '');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function openLevel(wi, li) {
    play.wi = wi; play.li = li;
    play.world = C.WORLDS[wi];
    play.level = play.world.levels[li];
    worldIndex = wi;
    Store.state.lastWorld = wi;
    setWorldColors(play.world);
    $('#play-chip').textContent = KIND[play.level.kind] + ' ' + (li + 1);
    $('#play-title').textContent = play.level.title;
    $('#play-credit').textContent = (play.level.credit ? play.level.credit + ' · ' : '') + play.level.skill;
    buildStaff();
    show('play');
    startPractice();
  }

  function buildStaff() {
    const s = Store.settings;
    const fingers = !s.fingers ? 'none' : play.level.fingers === 'all' ? 'all' : 'marked';
    play.staff = new PA.Staff($('#staff'), play.world, play.level, { fingers, names: s.noteNames });
    playKeys.setLabels(play.world, s.keyLabels);
  }

  function stopModes() {
    Audio.allOff();
    playKeys.allUp();
    playKeys.hint(null);
    $('#countin').hidden = true;
    play.beat = null;
    play.listen = null;
    $('#btn-listen span').textContent = 'Listen first';
    $('#btn-listen').classList.remove('on');
    $$('#beat-group .btn').forEach(b => b.classList.remove('on'));
  }

  function refreshBeatBar() {
    const r = Store.rec(play.level.id);
    const unlocked = r.stars > 0;
    $('#beat-note').textContent = !unlocked ? 'Finish once to unlock' : r.crown ? 'Best: ' + TEMPO[r.crown].crown + ' crown' : 'Play on the beat to win a crown';
    $$('#beat-group .btn').forEach(b => {
      const t = +b.getAttribute('data-tempo');
      b.classList.toggle('won', r.crown >= t);
      b.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
      b.style.opacity = unlocked ? '' : '0.45';
    });
  }

  function updateMeters() {
    const s = play.session;
    $('#meter-count').textContent = s.at + ' / ' + s.total + ' notes';
    $('#meter-streak').textContent = s.combo >= 3 ? s.combo + ' in a row' : '';
    $('#meter-bar').style.width = (s.total ? s.at / s.total * 100 : 0) + '%';
  }

  function showHandPosition() {
    const s = Store.settings;
    playKeys.setFingers(s.fingers && play.level.kind !== 'scale' ? C.handPosition(play.level, play.world) : null);
  }

  function startPractice(message) {
    stopModes();
    play.mode = 'practice';
    play.started = false;
    play.session = new PA.PracticeSession(play.staff.parsed, { anyOctave: Store.settings.anyOctave });
    play.staff.clearMarks();
    play.staff.jump(play.session.current().x);
    showHandPosition();
    if (Store.settings.hints === 'always') playKeys.hint(play.session.current().midi);
    coach(message || play.level.tip);
    updateMeters();
    refreshBeatBar();
  }

  function practicePress(midi) {
    const s = play.session;
    const res = s.press(midi);
    if (res.type === 'ignored') return;
    if (res.type === 'slip') {
      playKeys.down(midi, 'bad');
      const want = res.note.label;
      coach('That was ' + pitchName(midi, play.world) + '. Look ' + (res.direction === 'high' ? 'lower' : 'higher') + ' for ' + want + '.', 'oops');
      if (Store.settings.hints !== 'never') playKeys.hint(res.note.midi);
      updateMeters();
      return;
    }
    playKeys.down(midi, 'ok');
    play.staff.mark(res.note.index, res.clean ? 'done' : 'slip');
    if (!play.started) {
      play.started = true;
      if (play.level.fingers !== 'all') playKeys.setFingers(null);
    }
    updateMeters();
    if (res.finished) { playKeys.hint(null); finishPractice(); return; }
    play.staff.scrollTo(res.next.x);
    playKeys.hint(Store.settings.hints === 'always' ? res.next.midi : null);
    if (!res.clean) coach('That’s the one. Keep going.', 'good');
    else if (NUMBER_WORDS[s.combo]) coach(NUMBER_WORDS[s.combo] + ' right notes in a row.', 'good');
    else if (s.at === 1) coach('Good start. Take your time: the music waits for you.', 'good');
  }

  function finishPractice() {
    const s = play.session;
    const res = Store.commitPractice(play.wi, play.li, { notes: s.total, slips: s.slips, bestCombo: s.bestCombo });
    coach('Finished!', 'good');
    refreshBeatBar();
    Audio.fanfare(res.stars);
    setTimeout(() => { if (screen === 'play') showPracticeResult(res, s); }, 650);
  }

  /* ----- Listen: the game plays the exercise while the keys light up ----- */
  function startListen() {
    stopModes();
    play.mode = 'listen';
    const beatLen = 60 / 72;
    play.listen = { t0: now() + 0.6, beatLen, next: 0, sounding: [] };
    play.staff.clearMarks();
    playKeys.setFingers(null);
    $('#btn-listen span').textContent = 'Stop';
    $('#btn-listen').classList.add('on');
    coach('Listen and watch which keys go down. Then it is your turn.');
  }

  function frameListen() {
    const L = play.listen, notes = play.staff.parsed.notes;
    const beat = (now() - L.t0) / L.beatLen;
    play.staff.jump(play.staff.xAtBeat(beat));
    L.sounding = L.sounding.filter(v => {
      if (beat < v.off) return true;
      Audio.noteOff(v.midi); playKeys.up(v.midi);
      return false;
    });
    while (L.next < notes.length && notes[L.next].start <= beat) {
      const n = notes[L.next++];
      Audio.noteOn(n.midi, 0.75);
      playKeys.down(n.midi, 'demo');
      play.staff.mark(n.index, 'done');
      L.sounding.push({ midi: n.midi, off: n.start + n.dur * 0.88 });
    }
    if (beat >= play.staff.parsed.totalBeats + 0.4) startPractice('Your turn. Play it at your own pace.');
  }

  /* ----- Beat Challenge ----- */
  function startBeat(tempo) {
    if (Store.rec(play.level.id).stars === 0) { toast('Finish the exercise once at your own pace to unlock the Beat Challenge.'); return; }
    stopModes();
    play.mode = 'beat';
    const parsed = play.staff.parsed;
    const session = new PA.BeatSession(parsed, TEMPO[tempo].bpm, { anyOctave: Store.settings.anyOctave });
    const countIn = parsed.beatsPerBar;
    play.beat = { session, tempo, countIn, t0: now() + 0.4 + countIn * session.beatLen, nextClick: -countIn, done: false };
    play.staff.clearMarks();
    playKeys.setFingers(null);
    refreshBeatBar();
    $$('#beat-group .btn').forEach(b => b.classList.toggle('on', +b.getAttribute('data-tempo') === tempo));
    coach(TEMPO[tempo].name + ' tempo, ' + TEMPO[tempo].bpm + ' beats a minute. Hear the count-in, then play each note as it reaches the line.');
    $('#meter-count').textContent = '0 / ' + session.total + ' on the beat';
    $('#meter-streak').textContent = '';
    $('#meter-bar').style.width = '0%';
  }

  function frameBeat() {
    const B = play.beat, S = B.session, parsed = play.staff.parsed;
    const t = now() - B.t0, beat = t / S.beatLen;
    // Schedule metronome clicks a little ahead so they land exactly on the beat.
    while (B.nextClick < S.endBeat - 0.001 && B.nextClick * S.beatLen - t < 0.12) {
      const inCount = B.nextClick < 0;
      if (inCount || Store.settings.click) {
        const bar = ((B.nextClick % parsed.beatsPerBar) + parsed.beatsPerBar) % parsed.beatsPerBar;
        Audio.click(bar === 0, Audio.now() + Math.max(0, B.nextClick * S.beatLen - t));
      }
      B.nextClick++;
    }
    const ci = $('#countin');
    if (beat < 0) { ci.hidden = false; ci.textContent = Math.min(B.countIn, Math.max(1, Math.floor(beat + B.countIn) + 1)); }
    else ci.hidden = true;
    play.staff.jump(play.staff.xAtBeat(beat));
    S.sweep(t).forEach(n => play.staff.mark(n.index, 'miss'));
    if (!B.done && beat >= S.endBeat + 0.5) { B.done = true; finishBeat(); }
  }

  function beatPress(midi) {
    const B = play.beat;
    if (!B || B.done) return;
    const res = B.session.press(midi, now() - B.t0);
    if (res.type === 'extra') { playKeys.down(midi, 'bad'); return; }
    playKeys.down(midi, 'ok');
    play.staff.mark(res.note.index, res.quality === 'perfect' ? 'done' : 'slip');
    verdict(res.quality === 'perfect' ? 'On the beat!' : res.quality === 'early' ? 'A bit early' : 'A bit late', res.quality !== 'perfect');
    $('#meter-count').textContent = B.session.hits + ' / ' + B.session.total + ' on the beat';
    $('#meter-bar').style.width = (B.session.hits / B.session.total * 100) + '%';
  }

  function finishBeat() {
    const B = play.beat, S = B.session;
    const res = Store.commitBeat(play.wi, play.li, { notes: S.total, hits: S.hits, extras: S.extras, tempo: B.tempo });
    if (res.won) Audio.fanfare(B.tempo);
    refreshBeatBar();
    $$('#beat-group .btn').forEach(b => b.classList.toggle('on', false));
    setTimeout(() => { if (screen === 'play') showBeatResult(res, S, B.tempo); }, 500);
  }

  /* ----- Results ----- */
  function rewardMarkup(res) {
    let s = '<div class="xp-list">' + res.parts.map(p => '<div><span>' + esc(p.label) + '</span><span>+' + p.xp + ' XP</span></div>').join('') +
      '<div class="total"><span>Total</span><span>+' + res.xp + ' XP</span></div></div>';
    const news = [];
    if (res.rankUp) news.push(['⬆️', 'Rank ' + res.rankUp.number + ': ' + res.rankUp.title]);
    if (res.opened) news.push(['🔓', res.opened.type === 'world' ? res.opened.name + ' is now open!' : 'New exercise open: ' + res.opened.name]);
    if (res.firstClear) news.push(['🥁', 'Beat Challenge unlocked for this exercise']);
    if (res.goalHit) news.push(['🎯', 'Daily goal reached: ' + Store.DAILY_GOAL + ' exercises today']);
    res.badges.forEach(b => news.push([b.icon, 'Badge earned: ' + b.name]));
    if (news.length) s += '<div class="news">' + news.map(n => '<div><span>' + n[0] + '</span>' + esc(n[1]) + '</div>').join('') + '</div>';
    return s;
  }

  function nextOpen() {
    const w = C.WORLDS[play.wi];
    if (play.li + 1 < w.levels.length) return Store.isLevelOpen(play.wi, play.li + 1) ? { wi: play.wi, li: play.li + 1 } : null;
    if (play.wi + 1 < C.WORLDS.length && Store.isWorldOpen(play.wi + 1)) return { wi: play.wi + 1, li: 0 };
    return null;
  }

  function resultActions(extra) {
    const next = nextOpen();
    return '<div class="modal-actions">' + extra +
      (next ? '<button class="btn" data-act="map">Map</button><button class="btn primary" data-act="next">Next exercise</button>'
        : '<button class="btn primary" data-act="map">Back to the map</button>') + '</div>';
  }

  function showPracticeResult(res, s) {
    const clean = s.total - s.slips;
    const title = res.stars === 3 ? (s.slips === 0 ? 'Flawless!' : 'Brilliant!') : res.stars === 2 ? 'Well played!' : 'Finished!';
    const allow3 = Math.ceil(s.total * 0.05), allow2 = Math.ceil(s.total * 0.2);
    const tip = res.stars === 3 ? '' : res.stars === 2
      ? 'For three stars, slip on no more than ' + allow3 + (allow3 === 1 ? ' note.' : ' notes.')
      : 'For two stars, slip on no more than ' + allow2 + ' notes. There is no rush: slower is cleaner.';
    const r = Store.rec(play.level.id);
    openModal(
      '<div class="result"><h2>' + title + '</h2><p class="sub">' + clean + ' of ' + s.total + ' notes right the first time</p>' +
      '<div class="big-stars">' + [1, 2, 3].map(n => STAR.replace('<svg', '<svg' + (res.stars >= n ? ' class="got"' : ''))).join('') + '</div>' +
      (tip ? '<p class="note-line">' + tip + '</p>' : '') + rewardMarkup(res) + '</div>' +
      resultActions('<button class="btn" data-act="again">Play again</button>' + (r.crown < 3 ? '<button class="btn" data-act="beat" data-tempo="' + Math.min(3, r.crown + 1) + '">Beat Challenge</button>' : '')),
      { sticky: true });
  }

  function showBeatResult(res, S, tempo) {
    const T = TEMPO[tempo];
    const title = res.newCrown ? T.crown + ' crown!' : res.won ? 'Right on the beat!' : 'Nearly there';
    const tip = res.won ? (tempo < 3 ? 'Ready for the ' + TEMPO[tempo + 1].name.toLowerCase() + ' tempo?' : 'That is the fastest tempo. Superb.')
      : 'A crown needs 8 out of 10 notes on the beat. ' + (tempo > 1 ? 'Try a slower tempo, or practice once more at your own pace.' : 'Practice once more at your own pace, then try again.');
    openModal(
      '<div class="result"><h2>' + title + '</h2><p class="sub">' + S.hits + ' of ' + S.total + ' notes on the beat at ' + T.bpm + ' beats a minute' +
      (S.extras ? ', ' + S.extras + (S.extras === 1 ? ' stray note' : ' stray notes') : '') + '</p>' +
      '<div class="big-crown' + (res.won ? ' won c' + tempo : '') + '">' + CROWN + '</div>' +
      '<p class="note-line">' + tip + '</p>' + rewardMarkup(res) + '</div>' +
      resultActions('<button class="btn" data-act="beat" data-tempo="' + tempo + '">Try again</button>' +
        (res.won && tempo < 3 ? '<button class="btn" data-act="beat" data-tempo="' + (tempo + 1) + '">' + TEMPO[tempo + 1].name + ' tempo</button>' : '<button class="btn" data-act="again">Practice</button>')),
      { sticky: true });
  }

  function backToMap() {
    stopModes();
    closeModal();
    show('map');
    renderMap();
  }

  /* ================= Free play ================= */
  function openFree() {
    Audio.unlock();
    freeKeys.setLabels(null, Store.settings.keyLabels);
    PA.Staff.single($('#free-staff'), null, 15);
    $('#free-note').innerHTML = '&nbsp;';
    show('free');
  }
  function freePress(midi) {
    freeKeys.down(midi, '');
    const black = PA.isBlack(midi);
    $('#free-note').textContent = black ? PITCH_SHARP[midi % 12] + ' / ' + PITCH_FLAT[midi % 12] : PITCH_SHARP[midi % 12];
    $('#free-text').textContent = midi === 60 ? 'Middle C: home base for the right hand.'
      : black ? 'A black key has two names: a sharp of the key below and a flat of the key above.'
      : 'Octave ' + (Math.floor(midi / 12) - 1) + '. ' + (midi > 60 ? 'Above' : 'Below') + ' Middle C.';
    PA.Staff.single($('#free-staff'), midi >= 55 && midi <= 84 ? midi : null, 15);
  }

  /* ================= Badges ================= */
  function openBadges() {
    const earned = Store.state.badges;
    const count = Object.keys(earned).length;
    openModal(
      '<div class="modal-head"><h2>Badges <span style="font-size:18px;color:var(--ink-soft)">' + count + ' of ' + Store.BADGES.length + '</span></h2><button class="btn" data-act="close">Close</button></div>' +
      '<div class="badge-grid">' + Store.BADGES.map(b =>
        '<div class="badge ' + (earned[b.id] ? 'earned' : 'locked') + '"><div class="ico">' + b.icon + '</div><div><b>' + esc(b.name) + '</b><small>' + esc(b.how) + '</small></div></div>').join('') + '</div>',
      { wide: true });
  }

  /* ================= Settings ================= */
  function openSettings() {
    const s = Store.settings;
    const sw = (key, title, note) => '<div class="set-row"><div><b>' + title + '</b><small>' + note + '</small></div><button class="switch" role="switch" aria-checked="' + !!s[key] + '" data-set="' + key + '" aria-label="' + title + '"></button></div>';
    openModal(
      '<div class="modal-head"><h2>Settings</h2><button class="btn" data-act="close">Done</button></div>' +
      '<div class="set-row"><div><b>Volume</b></div><input type="range" id="set-volume" min="0" max="100" value="' + Math.round(s.volume * 100) + '" aria-label="Volume"></div>' +
      '<div class="set-section">Help while playing</div>' +
      sw('keyLabels', 'Letter names on the keys', 'Shows C D E F G A B on the keyboard.') +
      sw('fingers', 'Finger numbers', '1 is the thumb, 5 is the little finger.') +
      sw('noteNames', 'Letter names under the notes', 'A reading aid. Try switching it off once a key feels familiar.') +
      '<div class="set-row"><div><b>Show me the key</b><small>A dot marks the key to play.</small></div><div class="seg" data-seg="hints">' +
      [['always', 'Always'], ['mistake', 'After a slip'], ['never', 'Never']].map(o => '<button data-val="' + o[0] + '"' + (s.hints === o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>').join('') + '</div></div>' +
      sw('click', 'Metronome in the Beat Challenge', 'The count-in always clicks.') +
      '<div class="set-section">MIDI keyboard</div>' +
      '<div class="set-row"><div><b id="set-midi">' + esc(Midi.label()) + '</b><small>' + midiHelp() + '</small></div></div>' +
      sw('anyOctave', 'Accept any octave', 'Useful for small MIDI keyboards: a C counts wherever you play it.') +
      sw('midiSound', 'Play sound for MIDI keys', 'Switch off if your keyboard makes its own sound.') +
      '<div class="set-section">Progress</div>' +
      '<div class="set-row"><div><b>Start again from the beginning</b><small>Erases stars, crowns, XP, streak and badges on this device.</small></div><button class="btn danger" id="set-reset">Reset progress</button></div>');
  }

  function midiHelp() {
    if (Midi.status === 'connected') return 'Connected. Just play: the game listens to every MIDI input.';
    if (Midi.status === 'waiting') return 'Plug in a USB or Bluetooth MIDI keyboard and it connects by itself.';
    if (Midi.status === 'blocked') return 'Allow MIDI for this page in your browser, then reload.';
    return 'This browser has no MIDI support (Safari on iPad and Mac does not). Touch works everywhere; MIDI works in Chrome, Edge and Firefox on a computer or Android.';
  }

  let displayChanged = false;
  function onSetting(key, value) {
    Store.settings[key] = value;
    Store.save();
    if (key === 'volume') Audio.setVolume(value);
    if (['keyLabels', 'fingers', 'noteNames', 'hints', 'anyOctave'].indexOf(key) >= 0) displayChanged = true;
  }
  function settingsClosed() {
    if (!displayChanged) return;
    displayChanged = false;
    if (screen === 'play') { buildStaff(); startPractice(); }
    if (screen === 'free') freeKeys.setLabels(null, Store.settings.keyLabels);
  }

  function refreshMidiChips() {
    $$('[data-midi-chip]').forEach(chip => {
      chip.classList.toggle('live', Midi.status === 'connected');
      $('span', chip).textContent = Midi.status === 'connected' ? Midi.devices[0] : Midi.status === 'waiting' ? 'No MIDI keyboard' : 'Touch keyboard';
    });
    const line = $('#set-midi');
    if (line) line.textContent = Midi.label();
  }

  /* ================= Notes coming in ================= */
  Input.onNoteOn = function (midi, velocity, source) {
    Audio.unlock();
    if (source !== 'midi' || Store.settings.midiSound) Audio.noteOn(midi, velocity);
    if (modalOpen()) return;
    if (screen === 'free') { freePress(midi); return; }
    if (screen !== 'play') return;
    if (play.mode === 'practice') practicePress(midi);
    else if (play.mode === 'beat') beatPress(midi);
    else playKeys.down(midi, '');
  };
  Input.onNoteOff = function (midi) {
    Audio.noteOff(midi);
    if (screen === 'free') freeKeys.up(midi);
    else if (screen === 'play') {
      // Leave keys the demo is holding down alone.
      if (play.mode === 'listen' && play.listen && play.listen.sounding.some(v => v.midi === midi)) return;
      playKeys.up(midi);
    }
  };

  /* ================= Main loop ================= */
  let last = now();
  function frame() {
    const t = now(), dt = Math.min(0.1, t - last);
    last = t;
    if (screen === 'play' && play.staff) {
      if (play.mode === 'listen' && play.listen) frameListen();
      else if (play.mode === 'beat' && play.beat) frameBeat();
      else play.staff.update(dt);
    }
    requestAnimationFrame(frame);
  }

  /* ================= Wiring ================= */
  function init() {
    Store.load();
    Audio.setVolume(Store.settings.volume);
    worldIndex = Math.min(C.WORLDS.length - 1, Store.state.lastWorld || 0);
    playKeys = new PA.Keyboard($('#play-keys'), C.RANGE.low, C.RANGE.high);
    freeKeys = new PA.Keyboard($('#free-keys'), C.RANGE.low, C.RANGE.high);

    $('#worlds').addEventListener('click', e => { const b = e.target.closest('.world-tab'); if (b) onWorldTab(+b.getAttribute('data-wi')); });
    $('#trail').addEventListener('click', e => { const b = e.target.closest('.node'); if (b) onNode(+b.getAttribute('data-li'), b); });
    $('#open-badges').addEventListener('click', openBadges);
    $('#open-settings').addEventListener('click', openSettings);
    $('#play-settings').addEventListener('click', () => { if (play.mode !== 'practice') startPractice(); openSettings(); });
    $('#open-free').addEventListener('click', openFree);
    $('#play-back').addEventListener('click', backToMap);
    $('#free-back').addEventListener('click', () => { Audio.allOff(); show('map'); renderMap(); });
    $('#btn-listen').addEventListener('click', () => { Audio.unlock(); if (play.mode === 'listen') startPractice(); else startListen(); });
    $('#btn-restart').addEventListener('click', () => { Audio.unlock(); startPractice(); });
    $('#beat-group').addEventListener('click', e => { const b = e.target.closest('[data-tempo]'); if (b) { Audio.unlock(); startBeat(+b.getAttribute('data-tempo')); } });

    $('#overlay').addEventListener('click', e => {
      if (e.target.id === 'overlay') { if (modalDismissable) { closeModal(); settingsClosed(); } return; }
      const sw = e.target.closest('[data-set]');
      if (sw) { const on = sw.getAttribute('aria-checked') !== 'true'; sw.setAttribute('aria-checked', on); onSetting(sw.getAttribute('data-set'), on); return; }
      const segBtn = e.target.closest('[data-seg] button');
      if (segBtn) {
        $$('button', segBtn.parentNode).forEach(b => b.classList.toggle('on', b === segBtn));
        onSetting(segBtn.parentNode.getAttribute('data-seg'), segBtn.getAttribute('data-val'));
        return;
      }
      if (e.target.id === 'set-reset') {
        const b = e.target;
        if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Tap again to erase'; setTimeout(() => { if (b.isConnected) { b.classList.remove('armed'); b.textContent = 'Reset progress'; } }, 4000); return; }
        Store.reset(); Audio.setVolume(Store.settings.volume); worldIndex = 0; displayChanged = false;
        closeModal(); stopModes(); show('map'); renderMap(); toast('Progress erased. A fresh start!', true);
        return;
      }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.getAttribute('data-act');
      if (a === 'close') { closeModal(); settingsClosed(); }
      else if (a === 'map') backToMap();
      else if (a === 'again') { closeModal(); startPractice(); }
      else if (a === 'beat') { closeModal(); startBeat(+act.getAttribute('data-tempo')); }
      else if (a === 'next') { const n = nextOpen(); closeModal(); if (n) openLevel(n.wi, n.li); else backToMap(); }
    });
    $('#overlay').addEventListener('input', e => { if (e.target.id === 'set-volume') onSetting('volume', e.target.value / 100); });
    $('#overlay').addEventListener('change', e => { if (e.target.id === 'set-volume') { Audio.unlock(); Audio.noteOn(72, 0.8); setTimeout(() => Audio.noteOff(72), 350); } });

    Midi.onChange = (function () {
      let was = Midi.status;
      return function () {
        refreshMidiChips();
        if (Midi.status === 'connected' && was !== 'connected') toast('MIDI keyboard connected: ' + Midi.devices[0], screen === 'map');
        was = Midi.status;
      };
    })();
    Midi.init();
    refreshMidiChips();
    PA.initComputerKeys();

    document.addEventListener('pointerdown', Audio.unlock, { passive: true });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (screen === 'play' && play.mode !== 'practice') startPractice(); Audio.allOff(); }
      else if (screen !== 'map') wakeLock(true);
    });
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    if (window.ResizeObserver) new ResizeObserver(fit).observe($('#fit'));
    fit();

    renderMap();
    show('map');
    requestAnimationFrame(frame);

    if ('serviceWorker' in navigator && document.querySelector('link[rel="manifest"]') && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
