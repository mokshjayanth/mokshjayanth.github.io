/**
 * Reads the public Goodreads shelf widget and writes src/data/reads.json.
 *
 * Goodreads retired its API in 2020 and its RSS feeds in October 2026.
 * The custom shelf widget, the one it offers for embedding on other
 * sites, is what's left. It needs no key, only the public user ID.
 *
 * The written file is committed. If a later run cannot read Goodreads
 * the build simply keeps using the committed copy, so an outage there
 * never breaks a deploy.
 */

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = fileURLToPath(new URL('../src/data/reads.json', import.meta.url));
const USER_ID = '163529641';
const MAX_BOOKS = 100;

/**
 * Shelves to query, in priority order. A book is filed under the first
 * one it appears on. The widget has no dates of its own, so its sort
 * order is what puts each shelf in order.
 */
const SHELVES = [
  { name: 'currently-reading', bucket: 'current', sort: 'date_added' },
  { name: 'did-not-finish', bucket: 'abandoned', sort: 'date_added' },
  { name: 'to-read', bucket: 'queue', sort: 'date_added' },
  { name: 'read', bucket: 'finished', sort: 'date_read' },
];

function decode(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}

/** Goodreads titles carry the series in parentheses; drop it. */
function cleanTitle(t) {
  return t.replace(/\s*\([^)]*#[^)]*\)\s*$/, '').trim();
}

/** The widget is a script that writes HTML; unwrap the string it holds. */
function widgetHtml(script, shelf) {
  const literal = script.match(/var widget_code = '([\s\S]*?)'\n/)?.[1];
  const html = literal?.replace(/\\(u[0-9a-fA-F]{4}|[\s\S])/g, (_, c) => {
    if (c === 'n') return '\n';
    if (c.length > 1) return String.fromCharCode(parseInt(c.slice(1), 16));
    return c;
  });
  if (!html?.includes('gr_custom_container')) {
    throw new Error(`the ${shelf} widget has no shelf in it`);
  }
  return html;
}

async function fetchShelf({ name, sort }) {
  const u = new URL(`https://www.goodreads.com/review/custom_widget/${USER_ID}`);
  u.searchParams.set('shelf', name);
  u.searchParams.set('sort', sort);
  u.searchParams.set('order', 'd');
  u.searchParams.set('num_books', String(MAX_BOOKS));
  // Goodreads caches a widget's books by widget_id, so each run needs a
  // new one. Without it every shelf returns the same cached books.
  u.searchParams.set('widget_id', `${name}-${Date.now()}`);

  const res = await fetch(u, {
    headers: { 'user-agent': 'moving-parts-site/1.0' },
  });
  if (!res.ok) throw new Error(`Goodreads returned HTTP ${res.status}`);

  const html = widgetHtml(await res.text(), name);
  const blocks = html.split(/class="gr_custom_each_container[^"]*"/).slice(1);
  const books = blocks.map((block) => toBook(block, name));
  if (books.length >= MAX_BOOKS) {
    console.warn(`The ${name} shelf may be cut off at ${MAX_BOOKS} books.`);
  }
  return books;
}

/** One book from its widget block. Throws rather than guess at a field. */
function toBook(block, shelf) {
  const title = block.match(/<a title="([^"]*)"/)?.[1];
  const review = block.match(/href="([^"]*\/review\/show\/[^"]*)"/)?.[1];
  const cover = block.match(/<img[^>]*src="([^"]*gr-assets[^"]*\/books\/[^"]*)"/)?.[1];
  const author = block.match(/\/author\/show\/[^"]*">([^<]*)</)?.[1];
  if (!title || !review || !author) {
    throw new Error(`could not read a book on the ${shelf} widget`);
  }

  // Only the cover carries the book's ID. Review pages now need a sign-in,
  // so link to the book itself where the ID is known.
  const id = cover?.match(/\/(\d+)(?:\.[^/]*)?$/)?.[1];
  const reviewId = review.match(/\/review\/show\/(\d+)/)?.[1];
  return {
    id: id ?? `review-${reviewId}`,
    title: cleanTitle(decode(title)),
    author: decode(author).replace(/\s+/g, ' ').trim(),
    link: id ? `https://www.goodreads.com/book/show/${id}` : decode(review),
    cover: cover ? cover.replace('_SY75_', '_SX98_') : '',
    readAt: null,
    addedAt: null,
    review: '',
  };
}

async function readExisting() {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return null;
  }
}

/** The widget has no dates or reviews, so keep the ones already on file. */
function earlierDetails(existing) {
  const lists = ['current', 'finished', 'queue', 'abandoned'];
  const details = new Map();
  for (const book of lists.flatMap((key) => existing?.[key] ?? [])) {
    details.set(book.title, book);
  }
  return details;
}

async function main() {
  const earlier = earlierDetails(await readExisting());
  const buckets = { current: [], finished: [], queue: [], abandoned: [] };
  const seen = new Set();

  for (const shelf of SHELVES) {
    for (const book of await fetchShelf(shelf)) {
      if (seen.has(book.title)) continue; // first shelf wins
      seen.add(book.title);
      const known = earlier.get(book.title);
      buckets[shelf.bucket].push({
        ...book,
        readAt: known?.readAt ?? null,
        addedAt: known?.addedAt ?? null,
        review: known?.review ?? '',
      });
    }
  }

  // Four empty shelves means the widget changed, not that the books went.
  if (seen.size === 0) throw new Error('every shelf came back empty');

  const data = {
    updated: new Date().toISOString(),
    source: 'goodreads-widget',
    ...buckets,
  };

  await writeFile(OUT, JSON.stringify(data, null, 2) + '\n');

  const n = (k) => data[k].length;
  console.log(
    `Wrote ${path.basename(OUT)} — ${seen.size} books ` +
      `(current ${n('current')}, finished ${n('finished')}, ` +
      `queue ${n('queue')}, abandoned ${n('abandoned')}).`
  );
}

main().catch(async (err) => {
  console.error(`Goodreads fetch failed: ${err.message}`);
  // Show on the deploy's summary page; the run itself still passes.
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::warning title=Goodreads sync failed::${err.message}`);
  }
  try {
    await readFile(OUT);
    console.error('Keeping the committed src/data/reads.json.');
  } catch {
    console.error('No cached reads.json either — writing an empty shelf.');
    await writeFile(
      OUT,
      JSON.stringify(
        { updated: null, source: 'none', current: [], finished: [], queue: [], abandoned: [] },
        null,
        2
      ) + '\n'
    );
  }
});
