// Blackjack dealer + shared leaderboard for patrickbellanca.com/play/
// The server owns the shoe and every hand, so a streak can only come from real play.
// Storage: Cloudflare D1 (see schema.sql). No personal data is stored; names are what players type.

const ORIGINS = ['https://patrickbellanca.com', 'https://www.patrickbellanca.com', 'http://localhost:8090', 'http://127.0.0.1:8090'];
const DECKS = 6;
const SESSION_TTL = 24 * 3600;        // idle sessions are deleted after a day
const BOARD_SIZE = 10;
const NAME_MAX = 12;
const BLOCKED = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'bitch', 'dick', 'cock', 'pussy', 'whore', 'slut', 'rape', 'nazi', 'hitler', 'retard'];

// ---- cards ----
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['S', 'H', 'D', 'C'];
const rankOf = c => c.slice(0, -1);
const valueOf = c => { const r = rankOf(c); return r === 'A' ? 11 : 'JQK'.includes(r) ? 10 : +r; };
function score(cards) {
  let total = 0, aces = 0;
  for (const c of cards) { total += valueOf(c); if (rankOf(c) === 'A') aces++; }
  while (total > 21 && aces) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
const isBlackjack = cards => cards.length === 2 && score(cards).total === 21;
function newShoe() {
  const shoe = [];
  for (let d = 0; d < DECKS; d++) for (const s of SUITS) for (const r of RANKS) shoe.push(r + s);
  const rnd = new Uint32Array(shoe.length);
  crypto.getRandomValues(rnd);
  for (let i = shoe.length - 1; i > 0; i--) { const j = rnd[i] % (i + 1); [shoe[i], shoe[j]] = [shoe[j], shoe[i]]; }
  return shoe;
}

// ---- game ----
// state: { shoe, dealer, player, phase: 'idle'|'player'|'done'|'over', streak, result, final, submitted }
function draw(s) { if (s.shoe.length === 0) s.shoe = newShoe(); return s.shoe.pop(); }
function deal(s) {
  if (s.shoe.length < DECKS * 52 * 0.25) { s.shoe = newShoe(); s.shuffled = true; } else s.shuffled = false;
  s.player = []; s.dealer = []; s.result = null;
  s.player.push(draw(s)); s.dealer.push(draw(s)); s.player.push(draw(s)); s.dealer.push(draw(s));
  const up = s.dealer[0], peek = rankOf(up) === 'A' || valueOf(up) === 10;
  s.peeked = peek;
  if ((peek && isBlackjack(s.dealer)) || isBlackjack(s.player)) return finish(s);
  s.phase = 'player';
}
function hit(s) {
  s.player.push(draw(s));
  if (score(s.player).total >= 21) stand(s);
}
function stand(s) {
  if (score(s.player).total <= 21) while (score(s.dealer).total < 17) s.dealer.push(draw(s)); // stands on soft 17
  finish(s);
}
function finish(s) {
  const p = score(s.player).total, d = score(s.dealer).total, pBJ = isBlackjack(s.player), dBJ = isBlackjack(s.dealer);
  let r;
  if (p > 21) r = 'bust';
  else if (pBJ && dBJ) r = 'push';
  else if (pBJ) r = 'bj';
  else if (dBJ) r = 'lose';
  else if (d > 21 || p > d) r = 'win';
  else if (p === d) r = 'push';
  else r = 'lose';
  s.result = r;
  if (r === 'win' || r === 'bj') { s.streak++; s.phase = 'done'; }
  else if (r === 'push') s.phase = 'done';
  else { s.final = s.streak; s.phase = 'over'; }
}
// What the browser is allowed to see: the hole card stays hidden while the hand is live.
function view(s) {
  const live = s.phase === 'player';
  const dealer = live ? [s.dealer[0], null] : s.dealer;
  return {
    phase: s.phase, streak: s.phase === 'over' ? s.final : s.streak, result: s.result,
    player: s.player, dealer, playerTotal: s.player.length ? score(s.player) : null,
    dealerTotal: s.dealer.length ? score(live ? [s.dealer[0]] : s.dealer) : null,
    peeked: !!s.peeked, shuffled: !!s.shuffled,
    canSubmit: s.phase === 'over' && !s.submitted && s.final > 0,
  };
}

// ---- names ----
function cleanName(raw) {
  const name = String(raw || '').replace(/[^A-Za-z0-9 _.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  if (!name) return { error: 'Use letters and numbers (up to 12).' };
  const flat = name.toLowerCase().replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4@]/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't').replace(/[^a-z]/g, '');
  if (BLOCKED.some(w => flat.includes(w))) return { error: 'Please pick a different name.' };
  return { name };
}

// ---- storage ----
async function load(env, id) {
  if (!/^[a-f0-9]{32}$/.test(id || '')) return null;
  const row = await env.DB.prepare('SELECT state FROM sessions WHERE id = ?').bind(id).first();
  return row ? JSON.parse(row.state) : null;
}
const save = (env, id, s) => env.DB.prepare('INSERT INTO sessions (id, state, updated) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state, updated = excluded.updated')
  .bind(id, JSON.stringify(s), Math.floor(Date.now() / 1000)).run();
// A streak earns a save only if it would appear on the visible board.
// Ties rank by who got there first, so a tie with 10th place would not show.
async function qualifies(env, streak) {
  if (!(streak > 0)) return false;
  const row = await env.DB.prepare('SELECT streak FROM scores ORDER BY streak DESC, created ASC LIMIT 1 OFFSET ?').bind(BOARD_SIZE - 1).first();
  return !row || streak > row.streak;
}
async function board(env) {
  const { results } = await env.DB.prepare('SELECT name, streak FROM scores ORDER BY streak DESC, created ASC LIMIT ?').bind(BOARD_SIZE).all();
  return results;
}

// ---- http ----
function cors(req) {
  const o = req.headers.get('Origin');
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
}
const json = (req, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    const path = new URL(req.url).pathname;
    try {
      if (path === '/api/leaderboard' && req.method === 'GET') return json(req, { board: await board(env) });
      if (req.method !== 'POST') return json(req, { error: 'Not found' }, 404);
      const body = await req.json().catch(() => ({}));

      if (path === '/api/new') {
        await env.DB.prepare('DELETE FROM sessions WHERE updated < ?').bind(Math.floor(Date.now() / 1000) - SESSION_TTL).run();
        const id = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
        const s = { shoe: newShoe(), dealer: [], player: [], phase: 'idle', streak: 0, result: null, final: 0, submitted: false };
        await save(env, id, s);
        return json(req, { sid: id, ...view(s) });
      }

      const s = await load(env, body.sid);
      if (!s) return json(req, { error: 'Session expired. Start a new run.' }, 410);

      if (path === '/api/deal') {
        if (s.phase !== 'idle' && s.phase !== 'done') return json(req, { error: 'Finish this hand first.' }, 409);
        deal(s);
      } else if (path === '/api/hit' || path === '/api/stand') {
        if (s.phase !== 'player') return json(req, { error: 'No hand in play.' }, 409);
        path === '/api/hit' ? hit(s) : stand(s);
      } else if (path === '/api/submit') {
        if (s.phase !== 'over' || s.submitted || !(s.final > 0)) return json(req, { error: 'Nothing to submit.' }, 409);
        if (!(await qualifies(env, s.final))) return json(req, { error: "That streak didn't make the top 10." }, 409);
        const n = cleanName(body.name);
        if (n.error) return json(req, { error: n.error }, 400);
        await env.DB.prepare('INSERT INTO scores (name, streak, created) VALUES (?, ?, ?)').bind(n.name, s.final, Date.now()).run();
        s.submitted = true;
        await save(env, body.sid, s);
        return json(req, { ...view(s), board: await board(env), you: n.name });
      } else return json(req, { error: 'Not found' }, 404);

      await save(env, body.sid, s);
      const out = view(s);
      if (s.phase === 'over') { out.board = await board(env); out.canSubmit = out.canSubmit && await qualifies(env, s.final); }
      return json(req, out);
    } catch (e) {
      return json(req, { error: 'Dealer is unavailable. Try again.' }, 500);
    }
  },
};

// Exposed for local tests.
export const _test = { score, isBlackjack, finish, deal, hit, stand, view, cleanName };
