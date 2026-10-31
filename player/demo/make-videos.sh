#!/bin/sh
# Generates the demo videos (not in git: they weigh too much). A vertical clip as a phone records it, 1080 × 1920
# at 30 fps in H.264, with its poster: what the media zone has to fit into a horizontal screen.
# Needs ffmpeg. Usage: sh make-videos.sh
set -e
cd "$(dirname "$0")/media"
ffmpeg -loglevel error -y -f lavfi -i "testsrc2=size=1080x1920:rate=30:duration=12" \
  -vf "drawbox=x=0:y=820:w=1080:h=280:color=black@0.55:t=fill,drawtext=text='%{pts\:hms}':x=(w-tw)/2:y=880:fontsize=150:fontcolor=white" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -preset veryfast -crf 26 -movflags +faststart clip-vertical.mp4
ffmpeg -loglevel error -y -ss 2 -i clip-vertical.mp4 -frames:v 1 -q:v 5 clip-vertical.jpg
ls -l clip-vertical.mp4 clip-vertical.jpg
