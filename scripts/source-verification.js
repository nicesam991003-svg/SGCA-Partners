const { createHash } = require('node:crypto');

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
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) dates.add(new Date(parsed).toISOString().slice(0, 10));
  };
  // Only explicit datePublished/published_time metadata and labelled publication dates.
  for (const match of html.matchAll(/"datePublished"\s*:\s*"([^"]+)"/gi)) add(match[1]);
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (/article:published_time|datePublished|citation_publication_date/i.test(tag[0])) {
      const value = tag[0].match(/content\s*=\s*['"]([^'"]+)['"]/i); if (value) add(value[1]);
    }
  }
  const text = textFromHtml(html);
  const datePattern = '(\\d{4}-\\d{2}-\\d{2}|[A-Za-z]+ \\d{1,2},? \\d{4}|\\d{1,2} [A-Za-z]+ \\d{4})';
  for (const match of text.matchAll(new RegExp('(?:Date Published|Publish Date|Publication date|Publication|Published on|Released|Press Release|News Item)\\s*[:|]?\\s*' + datePattern, 'gi'))) add(match[1]);
  return [...dates];
}
async function fetchSource(value, domains, fetchImpl = fetch) {
  let url = value;
  // Grounding redirects are allowed only as the initial hop; never persisted as a source.
  for (let hop = 0; hop < 6; hop++) {
    const intermediary = hop === 0 && new URL(url).hostname === 'vertexaisearch.cloud.google.com' && new URL(url).pathname.startsWith('/grounding-api-redirect/');
    url = intermediary ? cleanUrl(url) : allowedUrl(url, domains);
    const response = await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { Accept: 'text/html', 'User-Agent': 'SGCA-SourceVerifier/1.0' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Source redirect lacks a destination');
      url = new URL(location, url).href;
      continue;
    }
    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    if (intermediary) throw new Error('Grounding redirect did not resolve to a publisher');
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) throw new Error('Source requires an inspectable HTML publication page');
    const html = await response.text();
    if (html.length > 3000000) throw new Error('Source page is too large');
    const title = textFromHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
    if (/page (?:not found|unavailable)|\b404\b|access denied|request access|just a moment|attention required/i.test(title + ' ' + url)) throw new Error('Source is an error or access challenge page');
    const text = textFromHtml((html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || [])[1] || html);
    if (!title || text.length < 200) throw new Error('Source content is missing');
    return { url, title, text, dates: publicationDates(html), sha256: createHash('sha256').update(text).digest('hex') };
  }
  throw new Error('Too many source redirects');
}
function verifyEvidence(report, source, today, maxAgeDays) {
  if (report.sourceTitle !== source.title) throw new Error('Source title does not match the retrieved page');
  const quote = textFromHtml(report.sourceQuote || '');
  if (quote.length < 40 || !source.text.includes(quote)) throw new Error('Source evidence quote is absent from the retrieved publication');
  if (!source.dates.includes(report.sourcePublishedDate)) throw new Error('Publication date could not be independently verified');
  const age = (Date.parse(today) - Date.parse(report.sourcePublishedDate)) / 86400000;
  if (!Number.isFinite(age) || age < 0 || age > maxAgeDays) throw new Error('Source publication is outside the requested time window');
  return { status: 'verified', url: source.url, title: source.title, publishedDate: report.sourcePublishedDate, quote, contentSha256: source.sha256, checkedAt: new Date().toISOString(), method: 'grounded-source-fetch-and-content-review' };
}
function firestoreValue(value) {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, v]) => [key, firestoreValue(v)])) } };
}
module.exports = { SOURCE_DOMAINS, cleanUrl, allowedUrl, textFromHtml, publicationDates, fetchSource, verifyEvidence, firestoreValue };
