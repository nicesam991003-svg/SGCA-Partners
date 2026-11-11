const { createHash } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');

const SOURCE_DOMAINS = {
  'management-system': ['iso.org', 'iec.ch', 'global-aci.org', 'kab.or.kr', 'anab.ansi.org', 'iasonline.org', 'ukas.com'],
  'cyber-security': ['iec.ch', 'ec.europa.eu', 'enisa.europa.eu', 'fda.gov', 'cisa.gov', 'nist.gov', 'mfds.go.kr', 'msit.go.kr', 'kisa.or.kr', 'cac.gov.cn', 'nmpa.gov.cn', 'pmda.go.jp', 'meti.go.jp'],
  'product-certification': ['ec.europa.eu', 'eur-lex.europa.eu', 'cencenelec.eu', 'osha.gov', 'federalregister.gov', 'govinfo.gov', 'ul.com', 'fmapprovals.com', 'csagroup.org', 'iecex.com', 'iec.ch', 'hazardexonthenet.net']
};
function cleanUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('Source must be a public HTTPS URL');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|trk$|_sp$)/i.test(key)) url.searchParams.delete(key);
  return url.href;
}
function allowedUrl(value, domains) {
  const url = new URL(cleanUrl(value));
  if (!domains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain))) throw new Error('Source is outside the approved domains');
  return url.href;
}
function textFromHtml(html) {
  return html.replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&[lr]squo;/g, "'").replace(/&[lr]dquo;/g, '"').replace(/\s+/g, ' ').trim();
}
function publicationDates(html) {
  const dates = new Set();
  const add = value => {
    // A publisher's local calendar date must not move a day when normalized to UTC.
    const calendarDate = value.trim();
    const isoDate = calendarDate.match(/^\d{4}-\d{2}-\d{2}(?=T|\s|$)/)?.[0];
    const parsed = Date.parse(isoDate || calendarDate + ' UTC');
    if (Number.isNaN(parsed)) return;
    const date = new Date(parsed).toISOString().slice(0, 10);
    if (!isoDate || isoDate === date) dates.add(date);
  };
  const datePattern = '(\\d{4}-\\d{2}-\\d{2}|[A-Za-z]+ \\d{1,2},? \\d{4}|\\d{1,2} [A-Za-z]+ \\d{4})';
  // The Commission prints its explicit publication date in the page header,
  // which is excluded from the article body and may differ from UTC metadata.
  for (const match of html.matchAll(/<li\b[^>]*class=["'][^"']*\becl-page-header__meta-item\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)) {
    const visible = textFromHtml(match[1]).match(new RegExp('^Publication\\s+' + datePattern + '$', 'i'));
    if (visible) add(visible[1]);
  }
  // CSRC's news date is the public release date, not the CMS creation date.
  for (const match of html.matchAll(/<small\b[^>]*id=["']news-date["'][^>]*>([\s\S]*?)<\/small>/gi)) {
    const visible = textFromHtml(match[1]).match(new RegExp('^' + datePattern + '$'));
    if (visible) add(visible[1]);
  }
  // ISO committee articles mark the article's byline date with the pubdate attribute.
  for (const [, header] of html.matchAll(/<header\b[^>]*class=["'][^"']*\bentry-header\b[^"']*["'][^>]*>([\s\S]*?)<\/header>/gi)) {
    for (const [tag] of header.matchAll(/<time\b[^>]*>/gi)) {
      if (!/\spubdate(?=\s|=|>)/i.test(tag)) continue;
      const date = tag.match(/\sdatetime\s*=\s*["']([^"']+)["']/i);
      if (date) add(date[1]);
    }
  }
  if (dates.size) return [...dates];
  // Only explicit datePublished/published_time metadata and labelled publication dates.
  for (const match of html.matchAll(/"datePublished"\s*:\s*"([^"]+)"/gi)) add(match[1]);
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (/article:published_time|datePublished|citation_publication_date/i.test(tag[0])) {
      const value = tag[0].match(/content\s*=\s*['"]([^'"]+)['"]/i); if (value) add(value[1]);
    }
  }
  if (dates.size) return [...dates];
  const text = textFromHtml(html);
  for (const match of text.matchAll(new RegExp('(?:Date Published|Publish Date|Publication date|Publication|Published on|Released|Press Release|News Item)\\s*[:|]?\\s*' + datePattern, 'gi'))) add(match[1]);
  return [...dates];
}
async function requestPublisher(url, fetchImpl, accept, redirect) {
  const backoff = [2000, 5000];
  for (let attempt = 0; ; attempt++) {
    const response = await fetchImpl(url, {
      redirect, signal: AbortSignal.timeout(20000),
      headers: { Accept: accept, 'User-Agent': 'SGCA-SourceVerifier/1.0' }
    });
    if (![429, 503].includes(response.status) || attempt === backoff.length) return response;

    const retryAfter = response.headers.get('retry-after');
    const serverDelay = retryAfter == null ? 0 : /^\d+$/.test(retryAfter) ?
      Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now();
    const wait = Math.max(backoff[attempt], Number.isNaN(serverDelay) ? 0 : serverDelay);
    // Leave this request to a future run if the publisher asks for a longer wait.
    if (wait > 45000) return response;
    await response.body?.cancel();
    await delay(wait);
  }
}

async function fetchPublisherHtml(value, domains, fetchImpl = fetch, allowGroundingRedirect = false) {
  let url = value;
  // Grounding redirects are allowed only as the initial hop; never persisted as a source.
  for (let hop = 0; hop < 6; hop++) {
    const intermediary = allowGroundingRedirect && hop === 0 && new URL(url).hostname === 'vertexaisearch.cloud.google.com' && new URL(url).pathname.startsWith('/grounding-api-redirect/');
    url = intermediary ? cleanUrl(url) : allowedUrl(url, domains);
    // Accept both document formats used by publishers; validate the returned type below.
    const response = await requestPublisher(url, fetchImpl, 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1', 'manual');
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Source redirect lacks a destination');
      url = new URL(location, url).href;
      continue;
    }
    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    if (intermediary) throw new Error('Grounding redirect did not resolve to a publisher');
    const contentType = response.headers.get('content-type') || '';
    if (!/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/i.test(contentType)) throw new Error('Source requires an inspectable HTML publication page');
    const html = await response.text();
    if (html.length > 3000000) throw new Error('Source page is too large');
    const title = textFromHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
    if (/page (?:not found|unavailable)|\b404\b|access denied|request access|just a moment|attention required/i.test(title + ' ' + url)) throw new Error('Source is an error or access challenge page');
    return { url, title, html };
  }
  throw new Error('Too many source redirects');
}
function commissionPdfLink(url, main) {
  const page = new URL(url);
  if (page.hostname !== 'health.ec.europa.eu' || !/^\/latest-updates\/[^/]+_en$/.test(page.pathname)) return null;
  const links = new Set();
  for (const [tag] of main.matchAll(/<a\b[^>]*>/gi)) {
    if (!/\becl-file__download\b/.test(tag)) continue;
    const href = tag.match(/\shref\s*=\s*["']([^"']+)["']/i);
    const target = href?.[1].replace(/&amp;/g, '&');
    if (!target || !URL.canParse(target, url)) continue;
    const link = new URL(target, url);
    if (link.origin === page.origin && !link.username && !link.password &&
        /^\/document\/download\/[a-f0-9-]+_en$/.test(link.pathname) &&
        /\.pdf$/i.test(link.searchParams.get('filename') || '')) links.add(link.href);
  }
  return links.size === 1 ? [...links][0] : null;
}

async function readCommissionPdf(url, fetchImpl) {
  const maxBytes = 5 * 1024 * 1024;
  const response = await requestPublisher(url, fetchImpl, 'application/pdf', 'error');
  if (!response.ok) throw new Error(`Official attachment HTTP ${response.status}`);
  if (!/^application\/pdf(?:;|$)/i.test(response.headers.get('content-type') || '') || !response.body) {
    throw new Error('Official attachment is not a PDF');
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('Official attachment is too large');
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  if (data.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Invalid official PDF attachment');

  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: new Uint8Array(data), isEvalSupported: false, useSystemFonts: false,
    useWorkerFetch: false, stopAtErrors: true, verbosity: 0
  });
  try {
    const document = await task.promise;
    const pages = [];
    for (let number = 1; number <= Math.min(document.numPages, 40); number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      pages.push(content.items.map(item => item.str || '').join(' '));
      page.cleanup();
    }
    const text = pages.join(' ').replace(/\s+/g, ' ').trim();
    if (text.length < 200) throw new Error('Official attachment has no verifiable text');
    return text;
  } finally {
    await task.destroy();
  }
}

async function fetchSource(value, domains, fetchImpl = fetch, shouldRead = () => true) {
  const {url,title,html} = await fetchPublisherHtml(value, domains, fetchImpl, true);
  const dates = publicationDates(html);
  if (!shouldRead({url, dates})) return null;
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  let text = textFromHtml(main);
  const attachmentUrl = dates.length && text.length < 200 ? commissionPdfLink(url, main) : null;
  if (attachmentUrl) text = await readCommissionPdf(attachmentUrl, fetchImpl);
  if (!title || text.length < 200) throw new Error('Source content is missing');
  return { url, title, text, dates, attachmentUrl, sha256: createHash('sha256').update(text).digest('hex') };
}
function verifyEvidence(report, source, today, maxAgeDays) {
  if (report.sourceTitle !== source.title) throw new Error('Source title does not match the retrieved page');
  const quote = textFromHtml(report.sourceQuote || '');
  if (quote.length < 40 || !source.text.includes(quote)) throw new Error('Source evidence quote is absent from the retrieved publication');
  if (!source.dates.includes(report.sourcePublishedDate)) throw new Error('Publication date could not be independently verified');
  const age = (Date.parse(today) - Date.parse(report.sourcePublishedDate)) / 86400000;
  if (!Number.isFinite(age) || age < 0 || age > maxAgeDays) throw new Error('Source publication is outside the requested time window');
  return { status: 'verified', url: source.url, title: source.title, publishedDate: report.sourcePublishedDate, quote, contentSha256: source.sha256, checkedAt: new Date().toISOString(), method: 'grounded-source-fetch-and-content-review', ...(source.attachmentUrl ? { attachmentUrl: source.attachmentUrl } : {}) };
}
function firestoreValue(value) {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, v]) => [key, firestoreValue(v)])) } };
}
module.exports = { SOURCE_DOMAINS, cleanUrl, allowedUrl, textFromHtml, publicationDates, fetchPublisherHtml, fetchSource, verifyEvidence, firestoreValue };
