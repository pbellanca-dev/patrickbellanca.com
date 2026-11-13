#!/bin/sh
# Make web-sized WebP copies of everything in originals/ -> docs/img/ (and 600px thumbs).
cd "$(dirname "$0")/.."
find originals -type f ! -name '*.pdf' | while read -r f; do
  rel="${f#originals/}"; base="${rel%.*}"
  out="docs/img/$base.webp"; th="docs/img/$base.thumb.webp"
  mkdir -p "$(dirname "$out")"
  [ -f "$out" ] || ffmpeg -nostdin -loglevel error -y -i "$f" -vf "scale='min(1600,iw)':-2" -frames:v 1 -c:v libwebp -quality 80 "$out" || echo "FAIL $f"
  [ -f "$th" ] || ffmpeg -nostdin -loglevel error -y -i "$f" -vf "scale='min(640,iw)':-2" -frames:v 1 -c:v libwebp -quality 78 "$th" || echo "FAILTHUMB $f"
done
mkdir -p docs/files && cp originals/2026/11/Patrick-Bellanca-Resume.pdf docs/files/
