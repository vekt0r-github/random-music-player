# randomMusicPlayer

site which currently plays audio (.mp3/.wav/.flac) files at random

modes supported:
- default songs: collection of songs i uploaded to a third-party site
- folder select: lets user select a local folder; recursively includes all audio files
- osu! collection: select your osu! folder, then pick one of your collections from the list
  - note: all song folders with a tilde character ('~') seem to be inaccessible with the File System Access API, so these songs are silently removed :(

dropbox integration and more features coming later

todos:
- list all songs in pool
- ability to remove songs <-
- stretch: move songs around and add songs
- improve textboxes
- add the none collection
- add unicode display toggle and similar settings