// PLAY: blackjack, streak mode. Hit or stand only.
// The dealer runs on a small server (worker/ in the repo), so the deck and the
// dealer's hole card never reach the browser and leaderboard streaks are real.
(() => {
  const root = document.getElementById('bj');
  if (!root) return;
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = local ? 'http://localhost:8787' : root.dataset.api;
  const $ = s => root.querySelector(s);
  const el = { streak: $('[data-streak]'), best: $('[data-best]'), dealer: $('[data-dealer]'), dtotal: $('[data-dtotal]'), hands: $('[data-hands]'), msg: $('[data-msg]'), panel: $('[data-panel]') };
  const btn = Object.fromEntries([...root.querySelectorAll('[data-act]')].map(b => [b.dataset.act, b]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  let sid = null, view = null, busy = false, best = +store.get('pb-bj-best') || 0;
  let shownDealer = [], shownPlayer = [];

  // ---- server ----
  async function call(path, body) {
    let res;
    try { res = await fetch(API + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { throw new Error("Can't reach the dealer. Check your connection and try again."); }
    const data = await res.json().catch(() => ({ error: 'Dealer is unavailable. Try again.' }));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Error'), { status: res.status });
    return data;
  }

  // ---- cards ----
  const SUIT = { S: '♠', H: '♥', D: '♦', C: '♣' }, SUIT_NAME = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
  function cardNode(code, isNew) {
    const n = document.createElement('div');
    n.setAttribute('role', 'img');
    if (!code) { n.className = 'pcard down' + (isNew ? ' deal' : ''); n.setAttribute('aria-label', 'Face-down card'); return n; }
    const r = code.slice(0, -1), s = code.slice(-1), sym = SUIT[s];
    n.className = 'pcard' + (s === 'H' || s === 'D' ? ' red' : '') + (isNew ? ' deal' : '');
    n.innerHTML = `<span class="c-corner">${r}<br>${sym}</span><span class="c-pip">${sym}</span><span class="c-corner c-flip">${r}<br>${sym}</span>`;
    n.setAttribute('aria-label', `${r} of ${SUIT_NAME[s]}`);
    return n;
  }
  const totalText = t => !t ? '' : t.soft && t.total < 21 ? `${t.total - 10} / ${t.total}` : String(t.total);
  const RESULT = { win: 'WIN', bj: 'BLACKJACK', push: 'PUSH', lose: 'LOSE', bust: 'BUST' };

  function paint(dealer, player, dTotal, pTotal, result, newD = -1, newP = -1) {
    el.dealer.replaceChildren(...dealer.map((c, i) => cardNode(c, i === newD)));
    el.dtotal.textContent = totalText(dTotal);
    const wrapEl = document.createElement('div'); wrapEl.className = 'bj-handwrap';
    wrapEl.innerHTML = `<p class="bj-label">You <span>${totalText(pTotal)}</span>${result ? ` <em class="r-${result}">${RESULT[result]}</em>` : ''}</p>`;
    const row = document.createElement('div'); row.className = 'bj-hand';
    row.append(...player.map((c, i) => cardNode(c, i === newP)));
    wrapEl.append(row);
    el.hands.replaceChildren(wrapEl);
  }
  // client-side totals for the in-between animation frames
  const val = c => { const r = c.slice(0, -1); return r === 'A' ? 11 : 'JQK'.includes(r) ? 10 : +r; };
  const total = cards => { let t = 0, a = 0; for (const c of cards) { if (!c) continue; t += val(c); if (c.startsWith('A')) a++; } while (t > 21 && a) { t -= 10; a--; } return cards.length ? { total: t, soft: a > 0 } : null; };

  // Animate from what is on screen to the new server view, one card at a time.
  async function animateTo(v, fresh) {
    const D = v.dealer, P = v.player;
    if (fresh) {
      shownDealer = []; shownPlayer = [];
      for (const [who, i] of [['p', 0], ['d', 0], ['p', 1], ['d', 1]]) { // deal order
        const c = who === 'p' ? P[i] : (i === 1 && v.phase === 'player' ? null : D[i]);
        if (who === 'p') shownPlayer.push(c); else shownDealer.push(c);
        paint(shownDealer, shownPlayer, total(shownDealer), total(shownPlayer), null, who === 'd' ? i : -1, who === 'p' ? i : -1);
        await wait(240);
      }
    }
    while (shownPlayer.length < P.length) { shownPlayer.push(P[shownPlayer.length]); paint(shownDealer, shownPlayer, total(shownDealer), total(shownPlayer), null, -1, shownPlayer.length - 1); await wait(260); }
    if (shownDealer[1] === null && D[1]) { shownDealer[1] = D[1]; paint(shownDealer, shownPlayer, total(shownDealer), total(shownPlayer), null, 1, -1); await wait(380); }
    while (shownDealer.length < D.length) { shownDealer.push(D[shownDealer.length]); paint(shownDealer, shownPlayer, total(shownDealer), total(shownPlayer), null, shownDealer.length - 1, -1); await wait(400); }
    paint(D, P, v.dealerTotal, v.playerTotal, v.result);
  }

  // ---- HUD and buttons ----
  function hud() {
    const phase = view ? view.phase : 'idle';
    el.streak.textContent = view && phase !== 'over' ? view.streak : 0;
    el.best.textContent = best;
    btn.deal.hidden = phase === 'player' || phase === 'over';
    btn.deal.textContent = phase === 'done' ? 'Next hand' : 'Deal';
    btn.hit.hidden = btn.stand.hidden = phase !== 'player';
    for (const b of Object.values(btn)) b.disabled = busy;
  }
  const say = t => { el.msg.textContent = t; };
  function outcomeText(v) {
    const d = v.dealerTotal && v.dealerTotal.total;
    switch (v.result) {
      case 'bj': return 'Blackjack!';
      case 'win': return d > 21 ? 'Dealer busts!' : 'You win!';
      case 'push': return 'Push. Your streak is safe.';
      case 'bust': return 'Bust.';
      default: return v.dealer.length === 2 && d === 21 ? 'Dealer has blackjack.' : 'Dealer wins.';
    }
  }
  function flash(win) { root.classList.add(win ? 'flash-win' : 'flash-lose'); setTimeout(() => root.classList.remove('flash-win', 'flash-lose'), 700); }

  // ---- actions ----
  async function act(path) {
    if (busy) return; busy = true; hud();
    try {
      if (!sid) await newRun();
      const fresh = path === '/api/deal';
      if (fresh) { say(''); el.panel.hidden = true; }
      const v = await call(path, { sid });
      if (fresh && v.shuffled) { say('Shuffling a fresh shoe…'); await wait(500); }
      await animateTo(v, fresh);
      view = v;
      if (v.phase === 'player') say(v.peeked ? 'Dealer does not have blackjack.\nHit or stand?' : 'Hit or stand?');
      else {
        say(outcomeText(v));
        if (v.phase === 'done' && v.streak > best) { best = v.streak; store.set('pb-bj-best', best); }
        if (v.result !== 'push') flash(v.phase === 'done');
        if (v.phase === 'over') { busy = false; hud(); await wait(700); showBoard(v); return; }
      }
    } catch (e) {
      if (e.status === 410) { sid = null; view = null; say('That run timed out. Deal to start a new one.'); }
      else say(e.message || 'Dealer is unavailable. Try again.');
    }
    busy = false; hud();
    if (!btn.deal.hidden) btn.deal.focus({ preventScroll: true });
  }
  async function newRun() { const v = await call('/api/new', {}); sid = v.sid; view = v; }

  // ---- leaderboard panel (shown when a run ends) ----
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function boardHtml(board, mine) {
    if (!board || !board.length) return '<p class="bj-note">No streaks yet. Be the first.</p>';
    let marked = false;
    return `<ol class="bj-board">${board.map((r, i) => { const me = !marked && mine && r.name === mine.name && r.streak === mine.streak; if (me) marked = true;
      return `<li${me ? ' class="me"' : ''}><span>${i + 1}</span><b>${esc(r.name)}</b><em>${r.streak}</em></li>`; }).join('')}</ol>`;
  }
  function showBoard(v, mine) {
    const form = v.canSubmit
      ? `<form class="bj-form" data-form><label for="bj-name">Add your name to the leaderboard</label><div><input id="bj-name" name="name" maxlength="12" autocomplete="nickname" placeholder="Your name" required value="${esc(store.get('pb-bj-name') || '')}"><button class="bj-btn primary" type="submit">Save</button></div><p class="bj-err" data-err aria-live="polite"></p></form>`
      : '';
    el.panel.innerHTML = `<h2>${v.streak} ${v.streak === 1 ? 'Win' : 'Wins'}</h2>${form}<h3>Win Streak Leaderboard</h3>${boardHtml(v.board, mine)}<button class="bj-btn primary" type="button" data-again>Play again</button>`;
    el.panel.hidden = false;
    const f = el.panel.querySelector('[data-form]');
    if (f) {
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const err = f.querySelector('[data-err]'), b = f.querySelector('button');
        b.disabled = true; err.textContent = '';
        try {
          const r = await call('/api/submit', { sid, name: f.elements.name.value.trim() });
          store.set('pb-bj-name', r.you);
          view = r; showBoard(r, { name: r.you, streak: r.streak });
        } catch (x) { err.textContent = x.message; b.disabled = false; }
      });
      setTimeout(() => f.elements.name.focus({ preventScroll: true }), 50);
    } else el.panel.querySelector('[data-again]').focus({ preventScroll: true });
    el.panel.querySelector('[data-again]').addEventListener('click', () => {
      el.panel.hidden = true; sid = null; view = null;
      paint([], [], null, null, null); hud();
      act('/api/deal');
    });
  }

  // ---- input ----
  btn.deal.addEventListener('click', () => act('/api/deal'));
  btn.hit.addEventListener('click', () => act('/api/hit'));
  btn.stand.addEventListener('click', () => act('/api/stand'));
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea, button')) return;
    const k = e.key.toLowerCase();
    if (view && view.phase === 'player') { if (k === 'h') act('/api/hit'); if (k === 's') act('/api/stand'); }
  });

  if (!API) { say('The dealer is being set up. Check back soon.'); for (const b of Object.values(btn)) b.disabled = true; return; }
  hud();
  act('/api/deal'); // first hand deals itself
})();
