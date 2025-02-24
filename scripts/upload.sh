# put mp3 audio files in unconv
# put songs.json in this folder
# be in this folder
# then source upload.sh

# source audio.sh
rsync -rv conv/ droplet:~/random-music-player-assets/songs
scp songs.json droplet:~/random-music-player-assets