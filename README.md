# Sight Read

A mobile-first sight reading trainer. Every read is a fresh, short piano piece composed for your level, and a **silent visual pulse** carries you through it in time, so you can practise anywhere without sound.

- **Ten graded levels**, from right hand in C position to two-hand jazz comping. The piece generator comes from Practice Room's Sight Reading Academy.
- **Visual pulse**: a brass cursor glides through the score at the tempo, the current bar is highlighted, beat lights and a pulse dot flash on every beat, and a big count-in shows before the first bar.
- **Optional extras**: fade bars once played, flash the screen edges on each beat, buzz on each beat (Android), or a quiet click.
- **Scan, then start**: the piece is shown first so you can check key, time and rhythms.
- **Honest self-rating** after each read. Three clean reads in a row at a level suggests the next one; losing your place twice suggests a slower tempo.
- Open your own **MusicXML** (`.musicxml`, `.xml`, `.mxl`) to read it with the same pulse.
- Works offline once loaded, and can be added to the home screen. Progress stays on the device.

## Run it

No build step. Serve the folder with any static server, for example `python3 -m http.server`, and open it on your phone.

To publish: **Settings → Pages → Deploy from a branch → `main` / root**.

## Files

- `index.html`, `styles.css`: layout and the Practice Room palette.
- `generator.js`: graded piece generator (MusicXML), from Practice Room.
- `app.js`: rendering with OpenSheetMusicDisplay, the timing map and the pulse, saved progress.
- `sw.js`, `manifest.json`, `icon.svg`: offline and home-screen install.
