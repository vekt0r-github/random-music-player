# random-music-player

site which currently plays audio (.mp3/.wav/.flac) files at random

modes currently supported:

- s-ul songs: directly link a `songs.json` data file, or provide your login (if you trust that this doesn't steal your data) and pool is created from all audio files uploaded to the given s-ul account
  - to get this data file, this is what i do:
    - in osu! collection mode, export my collection and also click dl data file
    - upload resulting `songs.json` to s-ul along with all the audio files, **keeping the exact name**
    - in s-ul songs mode, login once --- the program will internally merge the contents of `songs.json` with the online URLs of your files
    - once loaded, click dl data file here to get a URL-populated `songs.json`
    - upload this `songs.json` to s-ul, replacing the old data file, and save the new URL --- this is your data file link which will directly load your songs (or, you can upload the new data file wherever you want)
- folder select: lets user select a local folder; recursively includes all audio files
- osu! collection: select your osu! folder, then pick one of your collections from the list
  - note: all song folders with a tilde character ('~') seem to be inaccessible with the File System Access API, so these songs are silently removed :(
  - note: there's something weird with ID3 tags when using write metadata option in downloading a collection

## to run locally (in development mode)

- clone repo and navigate to root folder in two shells
- make sure you `npm i`
- make sure that ports 3000 and 5000 are free
- in one shell, `npm run start`
- in the other, `npm run hotloader`
- site should be served on localhost:5000

## todo

kete

- bug: song errors out in the middle of playback
  - investigate why only server-osu and not default mode
- drag + move songs around
- pool list sorting options
- reimplement scrollIfNeeded for pool box
- performance issues:
  - pool search component keying
  - pool loading dynamic url assignment for FolderSelect
  - dynamic url assignment should also preload playlist (if slow)
- search indexing still broken
