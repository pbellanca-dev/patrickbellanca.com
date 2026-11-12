// One-off migration helper: turns the saved WordPress pages into simple JSON blocks.
// Usage: node tools/extract.mjs <raw-html-dir> <out-dir>
import fs from 'node:fs';
import path from 'node:path';

const [rawDir, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const VOID = new Set(['img', 'br', 'hr', 'meta', 'link', 'input', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'track', 'param']);

function parse(html) {
  const root = { tag: 'root', attrs: {}, kids: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<(\/?)([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) { stack.at(-1).kids.push({ text: m[4] }); continue; }
    if (!m[2]) continue;
    const tag = m[2].toLowerCase();
    if (m[1]) {
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    const attrs = {};
    for (const a of m[3].matchAll(/([a-zA-Z_:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? a[5] ?? '';
    const node = { tag, attrs, kids: [] };
    stack.at(-1).kids.push(node);
    if (!VOID.has(tag) && !m[3].trim().endsWith('/')) stack.push(node);
  }
  return root;
}

const find = (n, pred) => { if (pred(n)) return n; for (const k of n.kids || []) { const r = find(k, pred); if (r) return r; } return null; };
const decode = s => s.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(n) {
  if (n.text !== undefined) return esc(decode(n.text));
  const inner = n.kids.map(inline).join('');
  switch (n.tag) {
    case 'a': return `<a href="${n.attrs.href || ''}">${inner}</a>`;
    case 'strong': case 'b': return inner.trim() ? `<strong>${inner}</strong>` : inner;
    case 'em': case 'i': return inner.trim() ? `<em>${inner}</em>` : inner;
    case 'br': return '<br>';
    case 'img': return '';
    default: return inner;
  }
}

function blocks(n, out) {
  for (const k of n.kids) {
    if (k.text !== undefined) { if (k.text.trim()) out.push({ t: 'p', html: esc(decode(k.text.trim())) }); continue; }
    const t = k.tag;
    if (/^h[1-6]$/.test(t)) out.push({ t: 'h', level: +t[1], html: inline(k).trim() });
    else if (t === 'p') { const imgs = []; walkImgs(k, imgs); imgs.forEach(s => out.push({ t: 'img', src: s })); const h = inline(k).trim(); if (h) out.push({ t: 'p', html: h }); }
    else if (t === 'img') out.push({ t: 'img', src: k.attrs.src });
    else if (t === 'iframe' || t === 'video') out.push({ t: 'video', src: k.attrs.src });
    else if (t === 'ul' || t === 'ol') out.push({ t: 'list', items: k.kids.filter(x => x.tag === 'li').map(li => inline(li).trim()) });
    else if (t === 'hr') out.push({ t: 'hr' });
    else if (t === 'a' && find(k, x => x.tag === 'img')) { const imgs = []; walkImgs(k, imgs); imgs.forEach(s => out.push({ t: 'img', src: s, href: k.attrs.href })); }
    else blocks(k, out);
  }
  return out;
}
function walkImgs(n, acc) { for (const k of n.kids || []) { if (k.tag === 'img') acc.push(k.attrs.src); else walkImgs(k, acc); } }

for (const f of fs.readdirSync(rawDir).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(rawDir, f), 'utf8');
  const tree = parse(html);
  const content = find(tree, n => (n.attrs?.class || '').split(/\s+/).includes('entry-content'));
  if (!content) { console.log('no content', f); continue; }
  const title = decode((html.match(/<title>([^<]*)/) || [])[1] || '');
  const out = { file: f, title, blocks: blocks(content, []) };
  fs.writeFileSync(path.join(outDir, f.replace('.html', '.json')), JSON.stringify(out, null, 1));
  console.log(f, out.blocks.length);
}
