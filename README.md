# Piano Quest

A piano learning game for the **right hand only**, sized for an iPad in landscape.
Play on the on-screen keyboard by touch, or plug in a MIDI keyboard.

The journey runs through four keys, each its own land on the map:

| Land | Key | New idea | Exercises |
| --- | --- | --- | --- |
| Sunrise Meadow | C major | All white keys, C position | 10 |
| Fern Forest | F major | B♭, the first black key | 8 |
| Glacier Lake | G major | F♯, moving the hand | 8 |
| Twilight Peaks | B♭ major | Two flats, thumb on a black key | 8 |

Every exercise stays inside its key (no accidentals beyond the key signature), starts
from a marked hand position and ends on the tonic, so each land trains the ear and the
hand in one tonality.

## How a land is built

Each land follows the same progression, so a new key always feels familiar:

1. **Steps** in the five-finger position.
2. **Skips** on the tonic chord.
3. **Tunes** that use both (traditional and classical melodies).
4. **Rhythm**: waltz time, then eighth notes and dotted rhythms in the later lands.
5. **Scale Climb**: the full one-octave scale with correct fingering.
6. **Key Quest**: a finale that opens the next land.

## Playing at your own pace

- **Practice** is the default. The music waits for you: play the right note and the
  staff moves on. A wrong key never ends anything; the game tells you which way to look.
- **Listen first** plays the exercise and lights the keys.
- **Beat Challenge** (optional, unlocked by finishing an exercise once) adds a
  metronome at three tempos: Slow 56, Steady 72, Quick 92 beats a minute.

### Rewards

| Reward | How it is earned |
| --- | --- |
| Stars (1 to 3) | 1 for finishing, 2 and 3 for fewer slips. One star opens the next exercise. |
| Crowns | Bronze, silver, gold: 8 notes in 10 on the beat at the slow, steady, quick tempo. |
| XP and ranks | Every finished run earns XP, with bonuses for new stars and crowns. Ten ranks, from Curious Beginner to Maestro. |
| Day streak | Days in a row with at least one finished exercise. |
| Daily goal | Three finished exercises a day. |
| Badges | 21 milestones: first exercise, flawless runs, each key finished, each key mastered, crowns, streaks. |

Nothing is ever taken away, nothing times out, and every exercise can be replayed for a
better result. Progress is saved on the device (browser local storage).

## Controls

- **Touch**: the on-screen keyboard is multi-touch and covers A3 to A5. Middle C has a dot.
- **MIDI**: any connected MIDI keyboard is picked up automatically (Web MIDI), including
  ones plugged in while the game is open. Settings has "Accept any octave" for small
  keyboards and a switch to mute the game's sound for MIDI notes.
- **Computer keyboard** (for a desk): `A S D F G H J K L ; '` are the white keys from
  Middle C, `W E T Y U O P ]` the black keys, and `Z X C` are A, B♭, B below Middle C.

> **MIDI on iPad.** At the time of writing, Safari (and every browser built on it on
> iPadOS) does not implement Web MIDI, so on an iPad the game is played by touch. MIDI
> works in Chrome, Edge and Firefox on Mac, Windows, ChromeOS, Linux and Android. On an
> iPad, a third-party browser app that adds Web MIDI is the only route.

## Running it

It is a static site with no build step.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` (or just open `index.html` in a browser).

To play on an iPad, host the folder on any HTTPS static host (GitHub Pages works: Settings
→ Pages → deploy from the `main` branch), open it in Safari, then **Share → Add to Home
Screen**. It then runs full screen and keeps working offline.

A single self-contained file can be produced with:

```bash
node tools/build-single.mjs
```

## Project layout

```
index.html            page shell: map, play screen, free play
css/style.css         all styling; one 1024 x 768 stage scaled to fit
js/curriculum.js      the 34 exercises and the music notation parser
js/staff.js           SVG notation: scrolling staff, beams, rests, key signatures
js/session.js         the rules: self-paced practice and the Beat Challenge
js/store.js           saved progress, stars, crowns, XP, streak, badges
js/input.js           on-screen keyboard, Web MIDI, computer keyboard
js/audio.js           synthesised piano and sound cues (Web Audio, no samples)
js/app.js             screens and game flow
js/glyphs.js          music symbol outlines
sw.js, manifest.webmanifest, icons/   install to Home Screen, offline play
tools/                validation, rule tests, single-file build
```

### Adding or editing exercises

Exercises are plain text in `js/curriculum.js`:

```js
music: 'C4q/1 D4q E4h | E4q D4q C4h'
```

A token is pitch, duration, and an optional finger: `w` whole, `H` dotted half, `h` half,
`Q` dotted quarter, `q` quarter, `e` eighth, `R` for a rest. Unmarked notes take their
finger from the last marked note, one finger per scale step. Check your work with:

```bash
npm test
```

It verifies that every bar adds up, every note is in the key and on the keyboard, every
note has a playable finger, and every exercise ends on the tonic.

## Credits

- Exercises and arrangements written for this project. The tunes are traditional or in
  the public domain (Beethoven, Dvořák, Vivaldi, Pierpont).
- Music symbols are outlines from the [Bravura](https://github.com/steinbergmedia/bravura)
  font by Steinberg, under the SIL Open Font License (`licenses/OFL-Bravura.txt`).
- This project is independent and is not affiliated with any published piano method.
