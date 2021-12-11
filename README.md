# randomMusicPlayer

site which currently plays audio (.mp3/.wav/.flac) files at random

modes supported:
- default songs: collection of songs i uploaded to a third-party site
- folder select: lets user select a local folder; recursively includes all audio files
- osu! collection: select your osu! folder, then pick one of your collections from the list
  - note: all song folders with a tilde character ('~') seem to be inaccessible with the File System Access API, so these songs are silently removed :(

dropbox integration and more features coming laterTM

todos:
- move songs around
- improve textboxes
- add the none collection
- sort pool list
- option to export collection to an osu! subfolder
- use api https://github.com/remanifest/s-ul-curl-uploader
- switching modes leaves the old one undead