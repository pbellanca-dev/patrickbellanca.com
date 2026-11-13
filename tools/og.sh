#!/bin/sh
# Builds link-preview images into docs/img/og/:
#   og-card.png      – site card (rendered from tools/og-card.html with headless Chrome)
#   <slug>.jpg       – 1200x630 crop of each game's hero image
cd "$(dirname "$0")/.."
mkdir -p docs/img/og
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget=5000 --window-size=1200,630 \
  --screenshot="$(pwd -W 2>/dev/null || pwd)/docs/img/og/og-card.png" \
  "file:///$(pwd -W 2>/dev/null || pwd)/tools/og-card.html" 2>/dev/null
node -e '
const fs=require("fs");
for (const g of require("./content/games.json")) {
  const hero = JSON.parse(fs.readFileSync(`content/games/${g.slug}.json`,"utf8")).hero;
  console.log(g.slug + " docs" + hero);
}' | while read -r slug src; do
  ffmpeg -nostdin -loglevel error -y -i "$src" \
    -vf "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630" -q:v 3 "docs/img/og/$slug.jpg"
done
ls docs/img/og | wc -l
