// One-off migration: WordPress block JSON (from extract.mjs) -> content/games/*.json
// Usage: node tools/import.mjs <json-dir>
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const outDir = path.join(root, 'content', 'games');
fs.mkdirSync(outDir, { recursive: true });

export const img = u => {
  u = u.replace(/&#0?38;.*/, '').replace('https://patrickbellanca.com/wp-content/uploads/', '/img/');
  if (u.includes('NITEWAVE')) u = '/img/2024/08/Screenshot-2024-08-02-Capture-The-Music-NITEWAVE-Magnopus-1.png';
  return u.replace(/\.[a-z0-9]+$/i, '.webp');
};
const links = h => h.replace(/https?:\/\/(www\.)?patrickbellanca\.com\//g, '/').replace(/&amp;#038;|&#038;/g, '&amp;');

// Home page cards, in the order shown on the current site.
const cards = [
  ['ragdoll-breakdown', 'Ragdoll and Seek', '2026', 'Solo Developer', '2024/07/RagdollAndSeek_VerticalCapsule.jpg'],
  ['ajs-anomaly-breakdown', 'AJ’s Anomaly', '2026', 'Lead Game Designer', '2024/07/AjsAnomaly_Vertical_Capsule1.png'],
  ['nfl-rivals-breakdown', 'NFL Rivals', '2024 – 2025', 'Lead Content Designer', '2025/10/NFL_Rivals-scaled.webp'],
  ['fortnite-breakdown', 'Fortnite Islands', '2023 – 2024', 'Lead Game Designer', '2024/07/Fortn.jpg'],
  ['avnu-breakdown', 'AVNU', '2022 – 2023', 'Lead Game Designer', '2024/07/avnu-1.png'],
  ['monopoly-breakdown', 'Monopoly GO!', '2020 – 2021', 'Lead Game Designer', '2024/07/mono2.jpg'],
  ['madden20-breakdown', 'Madden NFL 20', '2018 – 2019', 'Game Designer', '2024/07/12902939-83c5-4088-a845-5159d69d9f05-AP_Madden_20_Cover.webp'],
  ['madden19-breakdown', 'Madden NFL 19', '2017 – 2018', 'Game Designer', '2024/07/steelers-antonio-brown-madden-19-cover-photojpg-3.jpg'],
  ['madden18-breakdown', 'Madden NFL 18', '2016 – 2017', 'Game Designer', '2024/07/MV5BMjc3NTM4OGEtMWFjNy00OTU0LTkxYTEtZTkzZjE5MmYwNDA2XkEyXkFqcGdeQXVyMTk2OTAzNTI@._V1_.jpg'],
  ['madden17-breakdown', 'Madden NFL 17', '2015 – 2016', 'Game Designer', '2024/07/MV5BMDQ0ZDA5YTItZTM4NS00Mjk3LTg1YmItODI2YmIzODRiZTgyXkEyXkFqcGdeQXVyMTk2OTAzNTI@._V1_.jpg'],
  ['madden16-breakdown', 'Madden NFL 16', '2014 – 2015', 'Game Designer', '2024/07/m16w-3.webp'],
  ['madden15-breakdown', 'Madden NFL 15', '2013 – 2014', 'Associate Game Designer', '2024/07/MV5BMDhkNjc2OWQtNjUzOS00NDQ5LWFiM2YtMjQ4MGRjYWYxYmZiXkEyXkFqcGdeQXVyMTk2OTAzNTI@._V1_FMjpg_UX1000_.jpg'],
  ['madden14-breakdown', 'Madden NFL 14', '2012 – 2013', 'Associate Game Designer', '2024/07/Madden_NFL_25_Next-Gen.jpeg'],
  ['madden13-breakdown', 'Madden NFL 13', '2011 – 2012', 'Assistant Game Designer', '2024/07/Madden_NFL_13_cover.png'],
  ['madden12-breakdown', 'Madden NFL 12', '2010 – 2011', 'Assistant Game Designer', '2024/07/12.webp'],
  ['madden11-breakdown', 'Madden NFL 11', '2009 – 2010', 'Senior QA', '2024/07/71AfEligLcL._AC_UF10001000_QL80_.jpg'],
  ['madden-nfl-arcade', 'Madden NFL Arcade', '2009 – 2010', 'Senior QA', '2024/07/6-1-131256-52.jpg'],
  ['madden10-breakdown', 'Madden NFL 10', '2008 – 2009', 'Automation Analyst', '2024/07/61kTrQN3eL._AC_UF10001000_QL80_.jpg'],
  ['tiger09-breakdown', 'Tiger Woods 09', '2007 – 2008', 'Development Tester', '2024/07/maxresdefault-3.jpg'],
];

const index = [];
for (const [slug, title, years, role, cover] of cards) {
  const file = path.join(src, 'home' + slug.replace(/-/g, '_') + '_.json');
  const { blocks } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const g = { slug, title: blocks[0].html, role: blocks[1].html, hero: img(blocks[2].src), intro: [], sections: [], link: null, videos: [], gallery: [] };
  let i = 3, cur = null;
  for (; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.t === 'h' && /Game Link/.test(b.html)) {
      const m = b.html.match(/<a href="([^"]+)">(.*?)<\/a>/);
      g.link = { href: m[1], text: m[2] };
      i++; break;
    }
    const strongOnly = b.t === 'p' && /^<strong>(?:(?!<a).)*<\/strong>$/.test(b.html);
    if (b.t === 'h' || strongOnly) { cur = { heading: b.html.replace(/<\/?strong>/g, '').trim(), paragraphs: [] }; g.sections.push(cur); }
    else if (b.t === 'p') (cur ? cur.paragraphs : g.intro).push(links(b.html));
  }
  for (; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.t === 'video') g.videos.push(b.src.replace(/\?.*$/, '').replace('youtube.com', 'youtube-nocookie.com'));
    else if (b.t === 'img') g.gallery.push({ src: img(b.src), caption: '' });
    else if (b.t === 'p' && !/Previous Game|Next Game|>Home</.test(b.html) && g.gallery.length) g.gallery.at(-1).caption = links(b.html);
  }
  fs.writeFileSync(path.join(outDir, slug + '.json'), JSON.stringify(g, null, 2) + '\n');
  index.push({ slug, title, years, role, cover: img('https://patrickbellanca.com/wp-content/uploads/' + cover) });
}
fs.writeFileSync(path.join(root, 'content', 'games.json'), JSON.stringify(index, null, 2) + '\n');
console.log('imported', index.length);
