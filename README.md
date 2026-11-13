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
Porkbun → **ACCOUNT → Domain Management** → patrickbellanca.com → **Details** drop-down → edit icon next to **DNS Records**.
New records are added in the form at the top; existing ones are under **Current Records** at the bottom (trash-can icon deletes).
In the **Host** box type only the part before the domain — Porkbun adds `.patrickbellanca.com` itself.

GitHub verification TXT record (from GitHub → Settings → Pages → Add a domain):

| Type | Host | Answer |
|---|---|---|
| TXT | `_github-pages-challenge-pbellanca-dev` | the code GitHub shows |

**Delete** (these point at Porkbun's *Cloud for WordPress* hosting, which runs on WP Cloud):
- `A  (blank host)  192.0.79.158`
- `A  (blank host)  192.0.79.166`
- `A  www  192.0.79.158`
- `A  www  192.0.79.166`

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

## Checklist before cancelling the WordPress plan

The WordPress site is Porkbun's **Cloud for WordPress** hosting ($120/year), bought in the same Porkbun
account as the domain. Cancelling that hosting product does **not** close the Porkbun account or the
domain registration — those are separate products in the same account.

**Status: complete (12 Nov 2026).** The site is live on GitHub Pages and the WordPress hosting is cancelled.

- [x] **Back up WordPress first**: content export and media list are in `wordpress\`, and all 216 media files are in `wordpress\media\` (git-ignored).
- [x] All pages migrated: Home (19 game cards), 19 game breakdowns, Resume (+ PDF), About, Achievements, plus the Fortnite gameplay video.
- [x] New site live on `https://patrickbellanca.com` with the padlock (HTTPS); `http://` and `www` redirect to it. Certificate renews automatically.
- [x] Opened it on a phone and it looks right.
- [x] Email forwarding still works; MX, SPF, DKIM and DMARC records unchanged.
- [x] Cancelled Porkbun's *Cloud for WordPress* hosting (not the domain).
- [x] Re-checked DNS after cancelling: GitHub A records and `www` CNAME still in place; old `_acme-challenge` records are gone.
- [x] Porkbun domain registration on auto-renew; registered through 18 July 2027.

### If the site ever shows Porkbun's "Coming Soon" page

During the switch, Porkbun added an **ALIAS** record (host blank → `pixie.porkbun.com`, which serves a
"Coming Soon" page) that replaced the GitHub A records. If that happens again: in Porkbun → DNS Records,
delete the `pixie.porkbun.com` ALIAS (and any A records for `207.207.210.107` / `.229`), then re-add the
four GitHub A records above. If it keeps coming back, ask Porkbun support what is still attached to the domain.
