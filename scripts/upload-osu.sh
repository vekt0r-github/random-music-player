# put this in the local osu! root directory
# download the filelist.txt first, then
# source upload-osu.sh
rsync -avR osu!.db collection.db --files-from=filelist.txt droplet:~/random-music-player-assets/osu
