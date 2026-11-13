// Builds the static site into docs/ from content/.
// Usage: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const out = path.join(root, 'docs');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const site = { name: 'Patrick Bellanca', tagline: 'Lead Game Designer', url: 'https://patrickbellanca.com', email: 'pbellanca@gmail.com', linkedin: 'https://www.linkedin.com/in/patrickbellanca/' };
const strip = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const thumb = s => s.replace(/\.webp$/, '.thumb.webp');

const icons = {
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3zm7 0h3.8v1.5h.06c.53-1 1.84-2.05 3.79-2.05 4.05 0 4.8 2.67 4.8 6.13v5.42h-4v-4.8c0-1.15-.02-2.62-1.6-2.62-1.6 0-1.85 1.25-1.85 2.54v4.88h-4z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L4 7.3V17h16V7.3zm7.1-5.2H4.9L12 10.5z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
};

function layout({ title, description, active, body, pathName, image = '/img/og/og-card.png', imageAlt = 'Patrick Bellanca, Lead Game Designer', extraHead = '', home = false }) {
  const nav = [['/', 'Games'], ['/resume/', 'Resume'], ['/about-me/', 'About'], ['/achievements/', 'Achievements'], ['/play/', 'Play']]
    .map(([href, label]) => `<a href="${href}"${active === label ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const fullTitle = title ? `${title} – ${site.name}` : `${site.name} – ${site.tagline}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${attr(description)}">
<link rel="canonical" href="${site.url}${pathName}">
<meta property="og:type" content="website">
<meta property="og:title" content="${attr(fullTitle)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${site.url}${pathName}">
<meta property="og:image" content="${site.url}${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(imageAlt)}">
<meta property="og:site_name" content="${site.name}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0d12">
<!-- The site is already dark: ask browser dark modes and Dark Reader not to re-darken it. -->
<meta name="color-scheme" content="dark">
<meta name="darkreader-lock">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap">
<link rel="stylesheet" href="/css/style.css">
${extraHead}</head>
<body${home ? ' class="home"' : ''}>
${home ? '<div class="ambient" aria-hidden="true"><span></span><span></span><span></span></div>\n' : ''}
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">
      <img src="/img/2026/11/portrait-2026-96.webp" alt="" width="44" height="44">
      <span><strong>${site.name}</strong><small>${site.tagline}</small></span>
    </a>
    <div class="social">
      <a href="${site.linkedin}" aria-label="LinkedIn">${icons.linkedin}</a>
      <a href="mailto:${site.email}" aria-label="Email">${icons.mail}</a>
    </div>
    <nav class="main-nav" aria-label="Main">${nav}</nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p>© ${new Date().getFullYear()} ${site.name}</p>
    <p><a href="${site.linkedin}">LinkedIn</a> · <a href="mailto:${site.email}">${site.email}</a></p>
  </div>
</footer>
</body>
</html>
`;
}

function write(rel, html) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

// ---- Home ----
const games = JSON.parse(read('content/games.json'));
const cards = games.map((g, i) => `
    <li><a class="card" href="/${g.slug}/">
      <img src="${thumb(g.cover)}" alt="${attr(g.title)} cover art" loading="${i < 4 ? 'eager' : 'lazy'}" width="400" height="533">
      <span class="card-body"><span class="card-title">${g.title}</span><span class="card-meta">${g.years}</span><span class="card-role">${g.role}</span></span>
    </a></li>`).join('');
// Old WordPress links like /?page_id=35 still land on the right page.
const legacy = `<script>(function(){var m={33:'/',34:'/achievements/',35:'/resume/',36:'/about-me/'};var p=new URLSearchParams(location.search).get('page_id');if(p&&m[p]&&m[p]!=='/')location.replace(m[p]);})();</script>\n`;
write('index.html', layout({
  title: '', active: 'Games', pathName: '/', extraHead: legacy, home: true,
  description: 'Patrick Bellanca is a lead game designer with 20 shipped games over 18+ years, from Madden NFL to Monopoly GO! to Fortnite islands and indie titles on Steam.',
  body: `<section class="wrap intro">
  <p class="eyebrow">Lead Game Designer · Boulder, CO</p>
  <h1><strong>20 shipped games</strong>, from <em>Madden NFL</em> to <em>Monopoly GO!</em> to my own indie titles.</h1>
</section>
<section class="wrap">
  <div class="section-head"><h2>Shipped Games</h2><p>Tap a game to read the breakdown.</p></div>
  <ul class="grid">${cards}
  </ul>
</section>`,
}));

// ---- Game breakdowns ----
games.forEach((card, i) => {
  const g = JSON.parse(read(`content/games/${card.slug}.json`));
  const prev = games[i - 1], next = games[i + 1];
  const sections = g.sections.map(s => `<h2>${s.heading}</h2>\n${s.paragraphs.map(p => `<p>${p}</p>`).join('\n')}`).join('\n');
  const videos = g.videos.map(v => {
    if (v.endsWith('.mp4')) return `<video controls muted loop playsinline preload="metadata" poster="${v.replace(/\.mp4$/, '.webp')}" src="${v}"></video>`;
    const id = v.split('/').pop();
    return `<a class="video" href="https://www.youtube.com/watch?v=${id}" data-yt="${id}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="Play video" loading="lazy" width="480" height="360"><span class="play">${icons.play}</span></a>`;
  }).join('\n');
  // Pages without a video use their first screenshot as the big tile, so every page has the same layout.
  const featured = g.videos.length === 0 && g.gallery.length > 1;
  const shot = (x, big) => `<figure${big ? ' class="feature"' : ''}><a href="${x.src}"><img src="${big ? x.src : thumb(x.src)}" alt="${attr(x.caption ? strip(x.caption) : g.title + ' screenshot')}" loading="lazy"></a>${x.caption ? `<figcaption>${x.caption}</figcaption>` : ''}</figure>`;
  const feature = featured ? `<div class="videos">${shot(g.gallery[0], true)}</div>` : '';
  const gallery = g.gallery.slice(featured ? 1 : 0).map(x => shot(x, false)).join('\n');
  const pager = `<nav class="pager" aria-label="More games">
  ${prev ? `<a class="prev" href="/${prev.slug}/"><small>Previous</small>${prev.title}</a>` : '<span></span>'}
  <a class="home" href="/">All games</a>
  ${next ? `<a class="next" href="/${next.slug}/"><small>Next</small>${next.title}</a>` : '<span></span>'}
</nav>`;
  write(`${g.slug}/index.html`, layout({
    title: strip(g.title), active: 'Games', pathName: `/${g.slug}/`, image: `/img/og/${g.slug}.jpg`, imageAlt: `${strip(g.title)} key art`,
    description: strip(g.intro[0] || '').slice(0, 155),
    body: `<article class="wrap game">
  <p class="eyebrow"><a href="/">Games</a> · ${card.years}</p>
  <h1>${g.title}</h1>
  <p class="role">${g.role}</p>
  <img class="hero" src="${g.hero}" alt="${attr(strip(g.title))} key art">
  <div class="prose">
${g.intro.map(p => `<p class="lede">${p}</p>`).join('\n')}
${sections}
  </div>
  ${g.link ? `<p><a class="button" href="${g.link.href}">${g.link.text} ${icons.arrow}</a></p>` : ''}
  ${videos ? `<div class="videos">${videos}</div>` : feature}
  ${gallery ? `<div class="gallery">${gallery}</div>` : ''}
  ${pager}
</article>
<script src="/js/video.js" defer></script>`,
  }));
});

// ---- Simple pages ----
const pages = [
  ['resume', 'Resume', 'Resume', 'Resume of Patrick Bellanca: lead game designer with 18+ years at EA Sports, Scopely, Sony Immersive Music Studios, Mythical Games and more.'],
  ['about-me', 'About', 'About Me', 'About Patrick Bellanca, a game designer in Boulder, CO who has been making games for 18+ years.'],
  ['achievements', 'Achievements', 'Achievements', 'Career highlights: Congressional guest speaker, EA Outstanding Design honor, VR innovation lab founder and more.'],
];
for (const [slug, active, title, description] of pages) {
  write(`${slug}/index.html`, layout({ title, active, description, pathName: `/${slug}/`, body: read(`content/pages/${slug}.html`) }));
}

// ---- Play ----
// Blackjack dealer server (worker/). Set after deploying with wrangler.
const PLAY_API = 'https://pb-blackjack.pb-blackjack.workers.dev';
write('play/index.html', layout({ title: 'Play Blackjack', active: 'Play', pathName: '/play/',
  description: 'PLAY: blackjack in your browser by Patrick Bellanca. How many hands can you win in a row?',
  body: `<section class="wrap play">
  <h1>Play Blackjack</h1>
  <div class="bj" id="bj" data-api="${PLAY_API}">
    <div class="bj-hud"><div><small>Win Streak</small><strong data-streak>0</strong></div><div class="bj-best"><small>Best</small><strong data-best>0</strong></div></div>
    <div class="bj-dealer"><p class="bj-label">Dealer <span data-dtotal></span></p><div class="bj-hand" data-dealer></div></div>
    <p class="bj-msg" data-msg aria-live="polite"></p>
    <div class="bj-hands" data-hands></div>
    <div class="bj-actions">
      <button class="bj-btn primary" data-act="deal">Deal</button>
      <button class="bj-btn" data-act="hit" hidden>Hit</button>
      <button class="bj-btn" data-act="stand" hidden>Stand</button>
    </div>
    <div class="bj-panel" data-panel hidden role="dialog" aria-label="Leaderboard"></div>
  </div>
</section>
<script src="/js/blackjack.js" defer></script>`,
}));

write('404.html', layout({ title: 'Page not found', active: '', description: 'Page not found.', pathName: '/404.html', body: `<section class="wrap intro"><p class="eyebrow">404</p><h1>That page isn’t here.</h1><p><a class="button" href="/">See all games ${icons.arrow}</a></p></section>` }));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/resume/', '/about-me/', '/achievements/', '/play/', ...games.map(g => `/${g.slug}/`)].map(p => `  <url><loc>${site.url}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
console.log('built', games.length + pages.length + 2, 'pages');
