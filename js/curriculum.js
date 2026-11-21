/* Piano Quest — curriculum.
 *
 * Four lands, one per key: C, F, G and B-flat major. Every exercise is for the
 * right hand alone and stays inside its key (no accidentals beyond the key
 * signature), so each land trains the ear and the hand in one tonality.
 *
 * Music notation, one token per note, bars separated by "|":
 *   <pitch><duration>[/finger]
 *   pitch     C4, Bb4, F#5 ...   (R = rest)
 *   duration  w whole (4)  H dotted half (3)  h half (2)
 *             Q dotted quarter (1.5)  q quarter (1)  e eighth (0.5)
 *   finger    1 (thumb) to 5 (little finger). Unmarked notes take their finger
 *             from the last marked note, one finger per scale step.
 */
(function (root) {
  'use strict';

  const DUR = { w: 4, H: 3, h: 2, Q: 1.5, q: 1, e: 0.5 };
  const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const LETTER_IDX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

  const WORLDS = [
    {
      id: 'C', name: 'C Major', short: 'C', land: 'Sunrise Meadow', color: '#f28c0f', tint: '#fff1d9',
      accidentals: [], scale: [0, 2, 4, 5, 7, 9, 11],
      blurb: 'No sharps and no flats. Every note is a white key.',
      levels: [
        {
          id: 'c1', title: 'Three Stepping Stones', kind: 'exercise', skill: 'Steps on C, D, E', fingers: 'all', time: [4, 4],
          tip: 'Find Middle C (the dotted key) and rest your thumb on it. Fingers 1, 2, 3 play C, D, E.',
          music: 'C4q/1 D4q E4h | E4q D4q C4h | C4q D4q E4q D4q | C4w | E4q E4q D4q D4q | C4q D4q E4h | E4q D4q C4q D4q | C4w',
        },
        {
          id: 'c2', title: 'Hot Cross Buns', kind: 'song', credit: 'Traditional', skill: 'A first tune on three notes', fingers: 'all', time: [4, 4],
          tip: 'Same three keys, now a real tune. It starts on E with finger 3.',
          music: 'E4q/3 D4q C4h | E4q D4q C4h | C4q C4q C4q C4q | D4q D4q D4q D4q | E4q D4q C4h',
        },
        {
          id: 'c3', title: 'Five-Finger Trail', kind: 'exercise', skill: 'C position: C D E F G', fingers: 'first', time: [4, 4],
          tip: 'One finger per key: C D E F G under fingers 1 2 3 4 5. Keep your hand still and let the fingers walk.',
          music: 'C4q/1 D4q E4q F4q | G4w | G4q F4q E4q D4q | C4w | E4q D4q C4q D4q | E4q F4q G4h | G4q F4q E4q D4q | C4w',
        },
        {
          id: 'c4', title: 'Skipping Stones', kind: 'exercise', skill: 'Skips: the C chord (C E G)', fingers: 'first', time: [4, 4],
          tip: 'A skip jumps over one key and one finger. C, E, G with fingers 1, 3, 5 make the C chord.',
          music: 'C4q/1 E4q G4h | G4q E4q C4h | C4q E4q G4q E4q | C4w | E4q G4q E4h | D4q F4q D4h | C4q E4q G4q E4q | C4w',
        },
        {
          id: 'c5', title: 'Mary Had a Little Lamb', kind: 'song', credit: 'Traditional', skill: 'Steps and one skip', fingers: 'first', time: [4, 4],
          tip: 'Mostly steps, with one skip up to G. Read ahead while you hold the long notes.',
          music: 'E4q/3 D4q C4q D4q | E4q E4q E4h | D4q D4q D4h | E4q G4q G4h | E4q D4q C4q D4q | E4q E4q E4q E4q | D4q D4q E4q D4q | C4w',
        },
        {
          id: 'c6', title: 'Hill and Valley', kind: 'exercise', skill: 'Mixing steps, skips and long notes', fingers: 'first', time: [4, 4],
          tip: 'Half notes last two beats, whole notes four. The first phrase asks a question; the second answers on C.',
          music: 'C4h/1 E4q G4q | F4q E4q D4h | E4q F4q G4q E4q | D4w | C4h E4q G4q | F4q E4q D4h | E4q G4q F4q D4q | C4w',
        },
        {
          id: 'c7', title: 'Lightly Row', kind: 'song', credit: 'Traditional', skill: 'A longer tune in C position', fingers: 'first', time: [4, 4],
          tip: 'Start on G with finger 5. The tune drifts down to C and climbs back up the chord.',
          music: 'G4q/5 E4q E4h | F4q D4q D4h | C4q D4q E4q F4q | G4q G4q G4h | G4q E4q E4h | F4q D4q D4h | C4q E4q G4q G4q | C4w',
        },
        {
          id: 'c8', title: 'Lantern Waltz', kind: 'exercise', skill: 'Three beats in a bar', fingers: 'first', time: [3, 4],
          tip: 'A waltz counts 1-2-3. A dotted half note fills the whole bar: hold it for three beats.',
          music: 'C4q/1 E4q G4q | G4H | F4q E4q D4q | E4H | C4q E4q G4q | G4H | F4q E4q D4q | C4H',
        },
        {
          id: 'c9', title: 'C Major Scale Climb', kind: 'scale', skill: 'The full scale, thumb tucking under', fingers: 'all', time: [4, 4],
          tip: 'After finger 3 plays E, tuck your thumb under to F. Coming down, finger 3 crosses over the thumb to E.',
          music: 'C4h/1 D4h/2 | E4h/3 F4h/1 | G4h/2 A4h/3 | B4h/4 C5h/5 | C5h/5 B4h/4 | A4h/3 G4h/2 | F4h/1 E4h/3 | D4h/2 C4h/1 | ' +
            'C4q/1 D4q/2 E4q/3 F4q/1 | G4q/2 A4q/3 B4q/4 C5q/5 | C5q/5 B4q/4 A4q/3 G4q/2 | F4q/1 E4q/3 D4h/2 | C4w/1',
        },
        {
          id: 'c10', title: 'Jingle Bells', kind: 'quest', credit: 'James Pierpont, 1857', skill: 'Key Quest: everything in C position', fingers: 'first', time: [4, 4],
          tip: 'Your C major finale. Repeated notes need a light, bouncy finger. Finish it to open F major.',
          music: 'E4q/3 E4q E4h | E4q E4q E4h | E4q G4q C4q D4q | E4w | F4q F4q F4q F4q | F4q E4q E4q E4q | E4q D4q D4q E4q | D4h G4h | ' +
            'E4q E4q E4h | E4q E4q E4h | E4q G4q C4q D4q | E4w | F4q F4q F4q F4q | F4q E4q E4q E4q | G4q G4q F4q D4q | C4w',
        },
      ],
    },
    {
      id: 'F', name: 'F Major', short: 'F', land: 'Fern Forest', color: '#0b93a0', tint: '#d9f2f4',
      accidentals: ['Bb'], scale: [5, 7, 9, 10, 0, 2, 4],
      blurb: 'One flat. Every B is played as B♭, the black key just left of B.',
      levels: [
        {
          id: 'f1', title: 'Meet B-flat', kind: 'exercise', skill: 'F position: F G A B♭ C', fingers: 'all', time: [4, 4],
          tip: 'Thumb on F. The flat sign at the start of the staff means every B is B♭: finger 4 reaches up to the black key.',
          music: 'F4q/1 G4q A4h | A4q Bb4q C5h | C5q Bb4q A4q G4q | F4w | A4q Bb4q A4q G4q | A4q Bb4q C5h | C5q Bb4q A4q G4q | F4w',
        },
        {
          id: 'f2', title: 'Fern Hops', kind: 'exercise', skill: 'Skips: the F chord (F A C)', fingers: 'all', time: [4, 4],
          tip: 'F, A, C with fingers 1, 3, 5 make the F chord. Finger 4 still waits on B♭ for the skips from G.',
          music: 'F4q/1 A4q C5h | C5q A4q F4h | G4q Bb4q A4q C5q | A4w | F4q A4q C5h | C5q A4q F4h | G4q Bb4q A4q G4q | F4w',
        },
        {
          id: 'f3', title: 'Go Tell Aunt Rhody', kind: 'song', credit: 'Traditional', skill: 'A tune in F position', fingers: 'first', time: [4, 4],
          tip: 'Start on A with finger 3. Watch for the skip from G up to B♭ in the third bar.',
          music: 'A4h/3 A4q G4q | F4h F4h | G4h G4q Bb4q | A4q G4q F4h | C5h C5q Bb4q | A4h A4h | G4q F4q G4q A4q | F4w',
        },
        {
          id: 'f4', title: 'River Waltz', kind: 'exercise', skill: 'Waltz time in F', fingers: 'first', time: [3, 4],
          tip: 'Count 1-2-3 and lean gently on beat one. The long notes are where the river slows down.',
          music: 'A4h/3 C5q | Bb4h G4q | A4q G4q F4q | G4H | A4h C5q | Bb4h G4q | G4q A4q G4q | F4H',
        },
        {
          id: 'f5', title: 'Largo', kind: 'song', credit: 'Antonín Dvořák, from the New World Symphony', skill: 'A singing melody', fingers: 'first', time: [4, 4],
          tip: 'A slow, singing theme. Hold each long note for its full length and connect the notes smoothly.',
          music: 'A4q/3 C5q C5h | A4q G4q F4h | G4q A4q C5q A4q | G4w | A4q C5q C5h | A4q G4q F4h | G4q A4q G4q F4q | F4w',
        },
        {
          id: 'f6', title: 'F Major Scale Climb', kind: 'scale', skill: 'The full scale: four fingers, then thumb', fingers: 'all', time: [4, 4],
          tip: 'This scale uses fingers 1 2 3 4, then the thumb tucks under to C. Finger 4 lands on B♭ every time.',
          music: 'F4h/1 G4h/2 | A4h/3 Bb4h/4 | C5h/1 D5h/2 | E5h/3 F5h/4 | F5h/4 E5h/3 | D5h/2 C5h/1 | Bb4h/4 A4h/3 | G4h/2 F4h/1 | ' +
            'F4q/1 G4q/2 A4q/3 Bb4q/4 | C5q/1 D5q/2 E5q/3 F5q/4 | F5q/4 E5q/3 D5q/2 C5q/1 | Bb4q/4 A4q/3 G4h/2 | F4w/1',
        },
        {
          id: 'f7', title: 'Running Brook', kind: 'exercise', skill: 'Eighth notes: two to a beat', fingers: 'first', time: [4, 4],
          tip: 'Joined notes are eighth notes. Two of them fit in one beat: say "run-ning" for each pair.',
          music: 'F4e/1 G4e A4q G4e A4e Bb4q | A4e Bb4e C5q C5h | C5e Bb4e A4q Bb4e A4e G4q | A4q G4q F4h | ' +
            'F4e G4e A4q G4e A4e Bb4q | A4e Bb4e C5q C5h | C5e Bb4e A4e G4e A4q G4q | F4w',
        },
        {
          id: 'f8', title: 'When the Saints Go Marching In', kind: 'quest', credit: 'Traditional', skill: 'Key Quest: rests and long notes', fingers: 'first', time: [4, 4],
          tip: 'Your F major finale. The squiggle is a quarter rest: one beat of silence before each phrase. Finish it to open G major.',
          music: 'Rq F4q/1 A4q Bb4q | C5w | Rq F4q A4q Bb4q | C5w | Rq F4q A4q Bb4q | C5h A4h | F4h A4h | G4w | ' +
            'Rq A4q A4q G4q | F4H F4q | A4h C5h | C5h Bb4h | Rh A4q Bb4q | C5h A4h | F4h G4h | F4w',
        },
      ],
    },
    {
      id: 'G', name: 'G Major', short: 'G', land: 'Glacier Lake', color: '#2b7fe0', tint: '#e0eeff',
      accidentals: ['F#'], scale: [7, 9, 11, 0, 2, 4, 6],
      blurb: 'One sharp. Every F is played as F♯, the black key just right of F.',
      levels: [
        {
          id: 'g1', title: 'Lakeside Walk', kind: 'exercise', skill: 'G position: G A B C D', fingers: 'all', time: [4, 4],
          tip: 'Move your thumb up to G. Fingers 1 to 5 now cover G A B C D, all white keys.',
          music: 'G4q/1 A4q B4h | B4q C5q D5h | D5q C5q B4q A4q | G4w | B4q A4q G4q A4q | B4q C5q D5h | D5q C5q B4q A4q | G4w',
        },
        {
          id: 'g2', title: 'Ice Hops', kind: 'exercise', skill: 'Skips: the G chord (G B D)', fingers: 'all', time: [4, 4],
          tip: 'G, B, D with fingers 1, 3, 5 make the G chord. Listen for the question in bar 4 and the answer in bar 8.',
          music: 'G4q/1 B4q D5q B4q | G4h D5h | C5q A4q B4q G4q | A4w | G4q B4q D5q B4q | G4h D5h | C5q A4q B4q A4q | G4w',
        },
        {
          id: 'g3', title: "J'ai du bon tabac", kind: 'song', credit: 'French traditional', skill: 'A tune in G position', fingers: 'first', time: [4, 4],
          tip: 'A French folk tune that walks up from G. The half notes come in pairs: count two beats for each.',
          music: 'G4q/1 A4q B4q G4q | A4h A4q B4q | C5h C5h | B4h B4h | G4q A4q B4q G4q | A4h A4q B4q | C5h D5h | G4w',
        },
        {
          id: 'g4', title: 'Meet F-sharp', kind: 'exercise', skill: 'Low position: D E F♯ G A', fingers: 'all', time: [4, 4],
          tip: 'Slide down so your thumb sits on D. Finger 3 plays F♯, the black key, and finger 4 plays G. F♯ always wants to step up to G.',
          music: 'G4q/4 F#4q G4h | A4q G4q F#4h | E4q F#4q G4q A4q | G4w | D4q E4q F#4q G4q | A4h F#4h | G4q F#4q E4q F#4q | G4w',
        },
        {
          id: 'g5', title: 'Skipping Rhythm', kind: 'exercise', skill: 'Dotted quarter and eighth', fingers: 'first', time: [4, 4],
          tip: 'Back to G position. A dotted quarter lasts a beat and a half, and the eighth after it is quick: "long - short long".',
          music: 'G4Q/1 A4e B4h | B4Q C5e D5h | D5Q C5e B4q A4q | G4w | B4Q A4e G4h | A4Q B4e C5h | D5Q C5e B4q A4q | G4w',
        },
        {
          id: 'g6', title: 'Ode to Joy', kind: 'song', credit: 'Ludwig van Beethoven', skill: 'A famous theme with dotted rhythm', fingers: 'first', time: [4, 4],
          tip: 'Start on B with finger 3. The dotted rhythm you just learned closes each phrase.',
          music: 'B4q/3 B4q C5q D5q | D5q C5q B4q A4q | G4q G4q A4q B4q | B4Q A4e A4h | B4q B4q C5q D5q | D5q C5q B4q A4q | G4q G4q A4q B4q | A4Q G4e G4h',
        },
        {
          id: 'g7', title: 'G Major Scale Climb', kind: 'scale', skill: 'The full scale, with F♯ near the top', fingers: 'all', time: [4, 4],
          tip: 'Same fingering as C major: tuck the thumb under after finger 3. Finger 4 plays F♯ just before the top G.',
          music: 'G4h/1 A4h/2 | B4h/3 C5h/1 | D5h/2 E5h/3 | F#5h/4 G5h/5 | G5h/5 F#5h/4 | E5h/3 D5h/2 | C5h/1 B4h/3 | A4h/2 G4h/1 | ' +
            'G4q/1 A4q/2 B4q/3 C5q/1 | D5q/2 E5q/3 F#5q/4 G5q/5 | G5q/5 F#5q/4 E5q/3 D5q/2 | C5q/1 B4q/3 A4h/2 | G4w/1',
        },
        {
          id: 'g8', title: 'Au clair de la lune', kind: 'quest', credit: 'French traditional', skill: 'Key Quest: changing hand position', fingers: 'first', time: [4, 4],
          tip: 'Your G major finale. In the middle section your hand moves down: put finger 5 on A, then move back to G for the ending. Finish it to open B♭ major.',
          music: 'G4q/1 G4q G4q A4q | B4h A4h | G4q B4q A4q A4q | G4w | G4q/1 G4q G4q A4q | B4h A4h | G4q B4q A4q A4q | G4w | ' +
            'A4q/5 A4q A4q A4q | E4h/2 E4h | A4q/5 G4q F#4q E4q | D4w/1 | G4q/1 G4q G4q A4q | B4h A4h | G4q B4q A4q A4q | G4w',
        },
      ],
    },
    {
      id: 'Bb', name: 'B♭ Major', short: 'B♭', land: 'Twilight Peaks', color: '#8a4fd8', tint: '#eee3ff',
      accidentals: ['Bb', 'Eb'], scale: [10, 0, 2, 3, 5, 7, 9],
      blurb: 'Two flats. Every B is B♭ and every E is E♭.',
      levels: [
        {
          id: 'b1', title: 'Twilight Steps', kind: 'exercise', skill: 'B♭ position: B♭ C D E♭ F', fingers: 'all', time: [4, 4],
          tip: 'Thumb on the B♭ just below Middle C. Finger 4 plays the other black key, E♭. Two flats in the key signature: B♭ and E♭.',
          music: 'Bb3q/1 C4q D4h | D4q Eb4q F4h | F4q Eb4q D4q C4q | Bb3w | D4q Eb4q D4q C4q | D4q Eb4q F4h | F4q Eb4q D4q C4q | Bb3w',
        },
        {
          id: 'b2', title: 'Peak Hops', kind: 'exercise', skill: 'Skips: the B♭ chord (B♭ D F)', fingers: 'all', time: [4, 4],
          tip: 'B♭, D, F with fingers 1, 3, 5 make the B♭ chord. Keep your hand forward so the thumb reaches its black key easily.',
          music: 'Bb3h/1 D4q F4q | F4h D4h | C4q Eb4q C4q Eb4q | D4w | Bb3h D4q F4q | F4h D4h | Eb4q C4q D4q C4q | Bb3w',
        },
        {
          id: 'b3', title: 'Buzz, Buzz, Buzz', kind: 'song', credit: 'German traditional', skill: 'A tune in B♭ position', fingers: 'first', time: [4, 4],
          tip: 'A bee tune that starts at the top on F with finger 5. The middle bars repeat the same four-note shape.',
          music: 'F4h/5 Eb4h | D4w | C4q D4q Eb4q C4q | Bb3w | D4q Eb4q F4q D4q | C4q D4q Eb4q C4q | D4q Eb4q F4q D4q | C4q D4q Eb4q C4q | ' +
            'F4h Eb4h | D4w | C4q D4q Eb4q C4q | Bb3w',
        },
        {
          id: 'b4', title: 'Moonlit Waltz', kind: 'exercise', skill: 'Waltz time in B♭', fingers: 'first', time: [3, 4],
          tip: 'Count 1-2-3. The chord climbs in bar one, then the melody floats back down to B♭.',
          music: 'Bb3q/1 D4q F4q | F4h Eb4q | D4q C4q D4q | C4H | Bb3q D4q F4q | F4h Eb4q | D4q C4q C4q | Bb3H',
        },
        {
          id: 'b5', title: 'B♭ Major Scale Climb', kind: 'scale', skill: 'The full scale: start on finger 2', fingers: 'all', time: [4, 4],
          tip: 'For the full scale, start with finger 2 on B♭ so the thumb stays on white keys: 2, then 1 2 3, then 1 2 3 4.',
          music: 'Bb3h/2 C4h/1 | D4h/2 Eb4h/3 | F4h/1 G4h/2 | A4h/3 Bb4h/4 | Bb4h/4 A4h/3 | G4h/2 F4h/1 | Eb4h/3 D4h/2 | C4h/1 Bb3h/2 | ' +
            'Bb3q/2 C4q/1 D4q/2 Eb4q/3 | F4q/1 G4q/2 A4q/3 Bb4q/4 | Bb4q/4 A4q/3 G4q/2 F4q/1 | Eb4q/3 D4q/2 C4h/1 | Bb3w/2',
        },
        {
          id: 'b6', title: 'Spring', kind: 'song', credit: 'After Antonio Vivaldi, The Four Seasons', skill: 'Eighth notes in a famous theme', fingers: 'first', time: [4, 4],
          tip: 'Back to B♭ position with the thumb on B♭. The tune starts on beat 4, after three beats of rest. Keep the eighth notes light.',
          music: 'Rh Rq Bb3q/1 | D4q D4q D4q C4e Bb3e | F4H F4e Eb4e | D4q D4q D4q C4e Bb3e | F4H F4e Eb4e | D4q Eb4e F4e Eb4q D4q | C4h Rq Bb3q | ' +
            'D4q D4q D4q C4e Bb3e | F4H F4e Eb4e | D4q D4q D4q C4e Bb3e | F4H F4e Eb4e | D4q Eb4e F4e Eb4q C4q | Bb3w',
        },
        {
          id: 'b7', title: 'Dotted Dance', kind: 'exercise', skill: 'Dotted rhythm and eighths together', fingers: 'first', time: [4, 4],
          tip: 'Both rhythm ideas in one piece: "long - short" dotted pairs and running eighths. Count the beats steadily.',
          music: 'Bb3Q/1 C4e D4q F4q | Eb4Q D4e C4h | D4e Eb4e F4q Eb4e D4e C4q | D4h C4h | Bb3Q C4e D4q F4q | Eb4Q D4e C4h | D4e Eb4e F4q Eb4q C4q | Bb3w',
        },
        {
          id: 'b8', title: "Journey's End", kind: 'quest', credit: 'Finale', skill: 'Key Quest: chord, scale and rhythm', fingers: 'first', time: [4, 4],
          tip: 'The grand finale. Thumb on B♭ for the opening; switch to finger 2 for the scale run in the middle, then back to the thumb.',
          music: 'Bb3q/1 D4q F4q D4q | Eb4Q D4e C4h | D4q F4q Eb4q C4q | Bb3w | ' +
            'Bb3q/2 C4q/1 D4q/2 Eb4q/3 | F4q/1 G4q/2 A4q/3 Bb4q/4 | Bb4q/4 A4q/3 G4q/2 F4q/1 | Eb4q/3 D4q/2 C4q/1 Bb3q/2 | ' +
            'Bb3q/1 D4q F4q D4q | Eb4Q D4e C4h | D4e Eb4e F4q Eb4q C4q | Bb3w',
        },
      ],
    },
  ];

  function parsePitch(tok) {
    const m = /^([A-G])([b#]?)(\d)$/.exec(tok);
    if (!m) return null;
    const letter = m[1], acc = m[2], octave = +m[3];
    const midi = 12 * (octave + 1) + LETTER_PC[letter] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0);
    return { letter, acc, octave, midi, step: octave * 7 + LETTER_IDX[letter], label: letter + (acc === '#' ? '♯' : acc === 'b' ? '♭' : '') };
  }

  /* Turn a level's music string into timed events. Throws on malformed input. */
  function parseLevel(level) {
    const beatsPerBar = level.time[0] * (4 / level.time[1]);
    const events = [];
    let beat = 0;
    let anchor = null;
    const bars = level.music.split('|').map(s => s.trim()).filter(Boolean);
    bars.forEach((bar, barIndex) => {
      let barBeats = 0;
      bar.split(/\s+/).forEach(tok => {
        const m = /^([A-G][b#]?\d|R)([whqeHQ])(?:\/([1-5]))?$/.exec(tok);
        if (!m) throw new Error(level.id + ': bad token "' + tok + '"');
        const dur = DUR[m[2]];
        const ev = { index: events.length, bar: barIndex, start: beat, dur, durCode: m[2], rest: m[1] === 'R' };
        if (!ev.rest) {
          Object.assign(ev, parsePitch(m[1]));
          if (m[3]) {
            ev.finger = +m[3];
            ev.fingerMarked = true;
            anchor = { step: ev.step, finger: ev.finger };
          } else if (anchor) {
            const f = anchor.finger + (ev.step - anchor.step);
            ev.finger = f >= 1 && f <= 5 ? f : null;
          } else {
            ev.finger = null;
          }
        }
        events.push(ev);
        beat += dur;
        barBeats += dur;
      });
      if (Math.abs(barBeats - beatsPerBar) > 1e-9) {
        throw new Error(level.id + ': bar ' + (barIndex + 1) + ' has ' + barBeats + ' beats, expected ' + beatsPerBar);
      }
    });
    const notes = events.filter(e => !e.rest);
    return { events, notes, bars: bars.length, beatsPerBar, totalBeats: beat };
  }

  /* The five keys under the hand at the start of a level: [{midi, finger}]. */
  function handPosition(level, world) {
    const parsed = parseLevel(level);
    const first = parsed.notes[0];
    if (!first || !first.finger) return [];
    const inScale = [];
    for (let midi = first.midi - 12; midi <= first.midi + 12; midi++) {
      if (world.scale.indexOf(midi % 12) >= 0) inScale.push(midi);
    }
    const at = inScale.indexOf(first.midi);
    const out = [];
    for (let f = 1; f <= 5; f++) {
      const midi = inScale[at + (f - first.finger)];
      if (midi != null) out.push({ midi, finger: f });
    }
    return out;
  }

  const api = { WORLDS, DUR, parseLevel, parsePitch, handPosition, RANGE: { low: 57, high: 81 } };
  root.PA = root.PA || {};
  root.PA.Curriculum = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
