# Sight Read

A mobile sight reading trainer. Every read is a fresh, short piano piece composed for your level. You play it on an **on-screen keyboard** (like Jazz Bastard) while a **silent visual pulse** moves through the music in time. No MIDI keyboard and no sound needed.

- **Ten graded levels**, from right hand in C position to two-hand jazz comping. The pieces are composed by the generator from Practice Room's Sight Reading Academy.
- **Visual pulse**: an amber cursor glides through the score at the tempo, the current bar is highlighted, the beat lights flash on every beat, and a big count-in shows before bar 1. Optional: fade played bars, flash the screen edges, buzz (Android) or click on each beat.
- **On-screen keyboard** sized to the piece. When a piece is too wide for one phone keyboard, treble keys sit above bass keys. Multi-touch works, so you can play chords.
- **Scoring**: a tap counts when it's the right key within half a beat of the written note. Notes turn green (on the pulse), amber (a bit early or late) or red (missed). At the end you get notes right, on-the-pulse share and wrong keys.
- **Progress**: three reads of 90% or more at a level's tempo suggests the next level; two under 60% suggests a slower tempo. Stats stay on the device.
- Key sounds are optional and off by default.
- Works offline once loaded, and can be added to the home screen.

## Run it

No build step. Serve the folder with any static server (for example `python3 -m http.server`) and open it on your phone.

To publish: **Settings → Pages → Deploy from a branch → `main` / root**.

## Files

- `index.html`, `styles.css`: layout, Jazz Bastard's look and keyboard.
- `generator.js`: graded piece generator, from Practice Room.
- `app.js`: engraving with OpenSheetMusicDisplay, the timing map and pulse, the keyboard and scoring, saved progress.
- `sw.js`, `manifest.json`, `icon.svg`: offline use and home-screen install.
