# Moving Parts

Personal site and blog. Astro, static output, deployed to GitHub Pages.

## Running it

```sh
nvm use        # Node 22.23.3, pinned in .nvmrc
npm install
npm run dev    # http://localhost:4321/
npm run build  # -> dist/
```

Astro 7 requires Node >= 22.22.0.

## Sections

| Route          | Source                        |
| -------------- | ----------------------------- |
| `/`            | `src/pages/index.astro`       |
| `/essays`      | `src/content/essays/*.md`     |
| `/reads`       | `src/data/reads.json`         |
| `/sidequests`  | `src/content/sidequests/*.md` |

## Writing

Essays and side quests are Markdown with typed frontmatter — the schemas
live in `src/content.config.ts` and the build fails if a field is missing
or the wrong shape.

An essay:

```yaml
---
title: Physics and Computation
description: One line, used on the index and in meta tags.
date: 2026-10-18
draft: true
tags: []
---
```

`draft: true` keeps a piece off the index and out of production builds.

A side quest:

```yaml
---
title: Castlevania Atlas
description: Used in meta tags.
blurb: One line, shown on the index.
started: 2026-09-01
finished: 2026-10-17     # omit while in progress
status: done             # active | paused | done
stack: ['JavaScript', 'esbuild']
links:
  - label: Source
    href: https://github.com/...
    newTab: true         # optional; opens in a new tab
---
```

The index groups them: in-progress first, finished below.

## Reads

`src/data/reads.json` is generated from Goodreads and committed. Goodreads
retired its API in 2020 and its RSS feeds in October 2026, so the sync
reads the public shelf widget it offers for embedding on other sites.

```sh
npm run sync:reads
```

The widget needs no key, only the public user ID in
`scripts/fetch-reads.mjs`.

CI re-syncs on every deploy and on a daily cron. If Goodreads can't be
read the script logs it, exits 0 and leaves the committed JSON in place,
so an outage there cannot fail a deploy. On CI it also raises a warning
on the run, because a passing deploy can otherwise hide a broken sync
for days.

Each shelf is fetched separately — `currently-reading`, `did-not-finish`,
`to-read`, `read` — and a book is filed under the first it appears on.
Each request needs a new `widget_id`: Goodreads caches a widget's books
by that ID, and without it every shelf returns the same books.

The widget has no dates, so the shelf order comes from its sort, and read
years already in the JSON are kept. A book finished from now on has no
year. Goodreads changing the widget's HTML will stop the sync, so the
script fails on anything it can't read rather than writing a partial
shelf.

If a book lands in the wrong place, fix its shelves on Goodreads and
re-sync.

## Feed

`/rss.xml` carries published essays only — side quests are edited as the
work goes on, and a feed that re-fires on every tweak is a nuisance.
Autodiscovery is declared in the base layout, so readers find it from
any page.

## Links

Name, description and the Elsewhere links live in `src/data/site.json`
and are used by the home page, the footer and the feed. Edit them in
that one place.

## Theme

Light and dark, toggled in the header, defaulting to the system setting
and remembered in `localStorage`. There is no Auto control: Auto is what
a visitor gets until they choose otherwise, and a tap is a deliberate
choice. Clearing the stored value means clearing site data. Every colour is a custom property in
`src/styles/global.css` — defined on `:root`, redefined under
`prefers-color-scheme: dark` and again under `:root[data-theme='dark']`.
Changing the palette means editing that one block.

The visual design is deliberately plain for now. The background is the
next decision.

## Type and shared patterns

The serif is [Newsreader](https://github.com/productiontype/Newsreader),
self-hosted from `public/fonts/` under the OFL (`public/fonts/OFL.txt`):
one variable file for roman and one for italic, each carrying weight
and optical-size axes, so headings and body each get the cut drawn for
their size. Nothing is fetched from a third party, so the privacy page
needs no mention of it. The roman file is preloaded; the italic loads
only on pages that use it.

While it loads, the page shows Georgia scaled to Newsreader's metrics
(the `Newsreader Fallback` face in `global.css`), so text does not jump
when the real face swaps in. The overrides were computed from both
fonts' metric tables; recompute them if the font file is ever replaced.

Weights are tokens — `--weight-body`, `--weight-heading`,
`--weight-strong` — eased slightly in dark mode, where light text on a
dark ground reads heavier than it is.

Spectral (`101299c`) and Libron were tried along the way; Libron was
too dense on a phone.

Serif throughout — body and headings share one face, so a page reads as
a piece of writing rather than a document with a UI bolted on. Sans is
kept for small chrome (nav, meta, labels), where a serif at 13px
smears.

Three patterns live in `global.css` rather than in each page, so they
cannot drift apart: `.section-heading` (the ruled heading on Reads and
Side Quests), `.lede` (the opening line under a page title), and
`.link-row` (Elsewhere and the footer — navigation, so underlines
appear on hover only).

## Deploying

`.github/workflows/deploy.yml` builds and publishes on push to `main`.
It needs Pages enabled on the repo with source set to GitHub Actions.

The site is served from `mokshjayanth.github.io` as a user site, so
there is no `base` path.
Attaching a custom domain later means adding a `CNAME` file and DNS
records; nothing in the build changes.
