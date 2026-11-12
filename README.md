# patrickbellanca.com

Hand-built static site (plain HTML/CSS, one tiny JS file for click-to-play videos).
Replaces the WordPress.com site so the $120/year plan can be cancelled.

## Folders

| Path | What it is |
|---|---|
| `docs/` | **The website.** Everything in here is what gets published. |
| `content/games.json` | The home-page game cards (order, title, years, role, cover). |
| `content/games/*.json` | One file per game breakdown page. |
| `content/pages/*.html` | Resume, About and Achievements page bodies. |
| `tools/build.mjs` | Rebuilds the HTML in `docs/` from `content/`. |
| `tools/optimize.sh` | Makes web-sized `.webp` copies of images in `originals/` → `docs/img/`. |
| `originals/` | Full-size images downloaded from the old site (not published; git-ignored). |

## Editing

1. Edit a file in `content/` (or add an image to `originals/<year>/<month>/` and run `sh tools/optimize.sh`).
2. Run `node tools/build.mjs`.
3. Commit and push. GitHub Pages republishes in about a minute.

Adding a game: add a card to `content/games.json` (order = order on the home page), copy one of the
`content/games/*.json` files to `<slug>.json` and edit it. Images are referenced as `/img/…/name.webp`.

Preview locally: `npx http-server@14.1.1 docs -p 8090` then open http://localhost:8090.

---

## Deploy on GitHub Pages (free) — you do these steps

### 1. Put the site on GitHub
1. On github.com, create a new **public** repository, e.g. `patrickbellanca.com` (GitHub Pages is free for public repos). Don't add a README.
2. In this folder:
   ```bash
   git init -b main
   git add .
   git commit -m "Static site"
   git remote add origin https://github.com/pbellanca-dev/patrickbellanca.com.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, folder **`/docs`** → Save.
4. After a minute the site is live at `https://pbellanca-dev.github.io/patrickbellanca.com/` (images/links may look broken at this temporary address because the site expects to be at the domain root — that's fine, it fixes itself once the domain is attached).

### 2. Verify the domain with GitHub (prevents domain takeover)
1. GitHub → your profile picture → **Settings → Pages** → *Add a domain* → `patrickbellanca.com`.
2. GitHub shows a TXT record (`_github-pages-challenge-pbellanca-dev`). Add it in Porkbun (step 3), then click **Verify**.

### 3. Change DNS at Porkbun
Porkbun → Domain Management → patrickbellanca.com → **DNS**.

**Delete** (these point at WordPress.com):
- `A  patrickbellanca.com  192.0.79.158`
- `A  patrickbellanca.com  192.0.79.166`
- any `A`/`CNAME`/`ALIAS` record for `www` that points at WordPress.

**Add:**

| Type | Host | Answer |
|---|---|---|
| A | *(blank)* | 185.199.108.153 |
| A | *(blank)* | 185.199.109.153 |
| A | *(blank)* | 185.199.110.153 |
| A | *(blank)* | 185.199.111.153 |
| AAAA *(optional)* | *(blank)* | 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153 (one record each) |
| CNAME | www | pbellanca-dev.github.io |

**Do not touch** — these run your `@patrickbellanca.com` email forwarding, not the website:
- `MX  fwd1.porkbun.com` and `MX  fwd2.porkbun.com`
- `TXT  v=spf1 include:_spf.porkbun.com ~all`
- `TXT  _dmarc …`

### 4. Attach the domain and turn on HTTPS
1. Repo → **Settings → Pages → Custom domain**: `patrickbellanca.com` → Save (the `docs/CNAME` file already says this).
2. Wait for the DNS check to go green (minutes to a few hours), then tick **Enforce HTTPS**.
   The certificate can take up to ~an hour after DNS switches.
3. Check: `https://patrickbellanca.com`, `https://www.patrickbellanca.com` (should redirect), and an old link like `https://patrickbellanca.com/madden15-breakdown/`.

---

## Checklist before cancelling the WordPress.com plan

Do these in order; only cancel when every box is ticked.

- [ ] **Back up WordPress first** (while it's still live): WordPress.com dashboard → **Tools → Export → Export all** (content XML, emailed/downloaded), and **Export media library** (downloads all uploads). Save both somewhere safe, e.g. `C:\dev\patrickbellanca-site\wordpress-backup\` (it's fine to keep out of git).
  (All images already exist full-size in `originals/` too.)
- [ ] All pages migrated: Home (19 game cards), 19 game breakdowns, Resume (+ PDF), About, Achievements. *(Done in this folder.)*
- [ ] New site live on `https://patrickbellanca.com` with the padlock (HTTPS), and `www` redirects to it.
- [ ] Opened it on your phone and it looks right.
- [ ] Sent yourself a test email to your `@patrickbellanca.com` address (if you use one) and it still arrives.
- [ ] Check WordPress.com → **Upgrades → Domains**: if `patrickbellanca.com` is listed as a *connected/mapped* domain, remove it there — that only disconnects it from WordPress.com; the domain itself stays registered at Porkbun.
- [ ] Cancel the plan: WordPress.com → **Upgrades → Purchases** → the plan → **Cancel plan** (ask for a refund if you're within the refund window). Turn off auto-renew.
- [ ] Make sure the **Porkbun domain registration** itself stays on auto-renew — that's separate from WordPress and you still need it.
