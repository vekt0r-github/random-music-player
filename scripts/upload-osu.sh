# put this in the local osu! root directory
# download the filelist.txt first, then
# source upload-osu.sh
rsync -avR --files-from=filelist.txt . droplet:~/random-music-player-assets/osu

# run the below instead if not updating songs
# rsync -avR 'osu!.json' collection.json droplet:~/random-music-player-assets/osu
