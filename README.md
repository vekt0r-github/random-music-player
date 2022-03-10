# randomMusicPlayer

site which currently plays audio (.mp3/.wav/.flac) files at random

modes currently supported:
- s-ul songs: provide your login (if you trust that this doesn't steal your data) and pool is created from all audio files uploaded to the given s-ul account
- folder select: lets user select a local folder; recursively includes all audio files
- osu! collection: select your osu! folder, then pick one of your collections from the list
  - note: all song folders with a tilde character ('~') seem to be inaccessible with the File System Access API, so these songs are silently removed :(
  - note: there's something weird with ID3 tags when using write metadata option in downloading a collection
- default songs (deprecated): collection of songs i uploaded to a third-party site; i will delete this eventually, but keeping as a backup in case s-ul option stops working

## to run locally (in development mode)

- clone repo and navigate to root folder in two shells
- make sure you `npm i`
- make sure that ports 3000 and 5000 are free
- in one shell, `npm run start`
- in the other, `npm run hotloader`
- site should be served on localhost:5000

## todo
kete
- move songs around
- sort pool list
- or use api https://github.com/remanifest/s-ul-curl-uploader
- reimplement scrollIfNeeded for pool box
- improve performance with many songs
- make sure revokeObjectURL is called at the end too
- for some reason clicking on playlist curr bug is back