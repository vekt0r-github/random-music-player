#!/bin/bash
mkdir conv
OLDFILES="conv/*.mp3"
for f in $OLDFILES
do
    #mv "$f" "old-$f"
    mv "un$f" "old-un$f"
done
find . -name '*Zone.Identifier' -delete
FILES="unconv/*.mp3"
for f in $FILES
do
    brate=$(ffprobe "$f" |& grep -Eo 'bitrate: [0-9]+' | cut -d' ' -f2)
	echo "${f:7} $brate" >> "log.txt"
    if [[ "$brate" -gt 1800 ]]
    then
		ffmpeg -i "$f" -codec:a libmp3lame -b:a 192k "${f:2}"
	else
		ffmpeg -i "$f" -codec:a libmp3lame -b:a 128k "${f:2}"
	fi
done