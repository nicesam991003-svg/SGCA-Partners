const { SOURCE_DOMAINS, allowedUrl, cleanUrl, fetchPublisherHtml, fetchSource } = require('./source-verification');

function officialIndexes(category, today) {
  if (category === 'cyber-security') return [
    { url: 'https://digital-strategy.ec.europa.eu/en/news', path: /^\/en\/news\/[^/]*(?:cyber|resilien|vulnerabil|secure-by-design)[^/]*\/?$/i },
    ...[...new Set([today.slice(0, 4), new Date(Date.parse(today) - 14 * 86400000).getUTCFullYear()])].map(year => ({
      url: 'https://csrc.nist.gov/News/' + year, path: new RegExp('^/news/' + year + '/[^/]+/?$', 'i')
    }))
  ];
  if (category === 'management-system') return [{
    url: 'https://committee.iso.org/sites/tc176/home/news.html',
    path: /^\/sites\/tc176\/home\/news\/content-left-area\/news-and-updates\/[^/]+\.html$/i
  }];
  if (category === 'product-certification') return [{
    url: 'https://health.ec.europa.eu/medical-devices-sector_en',
    path: /^\/latest-updates\/[^/]+_en$/i
  }];
  return [];
}

function publisherLinks(html, base, path, domains) {
  const found = new Set();
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(['"])(.*?)\1/gi)) {
    try {
      const url = new URL(match[2].replace(/&amp;/g, '&'), base);
      if (url.hostname === new URL(base).hostname && path.test(url.pathname)) found.add(allowedUrl(url.href, domains));
    } catch { /* ignore invalid and non-publisher links */ }
  }
  return [...found];
}

function groundedLinks(discovery) {
  const chunks = discovery.grounding?.groundingChunks || [];
  const title = String(discovery.report?.sourceTitle || '').trim().toLowerCase();
  const linked = new Set((discovery.grounding?.groundingSupports || []).flatMap(s => s.groundingChunkIndices || []));
  return [...new Set(chunks.map((c, i) => ({
    uri: c.web?.uri,
    priority: (title && c.web?.title?.trim().toLowerCase() === title ? 2 : 0) + (linked.has(i) ? 1 : 0)
  })).filter(c => typeof c.uri === 'string').sort((a, b) => b.priority - a.priority).map(c => c.uri))];
}

function freshDate(source, today, maxDays) {
  return source.dates.find(date => {
    const age = (Date.parse(today) - Date.parse(date)) / 86400000;
    return age >= 0 && age <= maxDays;
  });
}

async function discoverSources({category, today, existingLinks = [], search, onlyOfficial = false, fetchImpl = fetch, log = console}) {
  const domains = SOURCE_DOMAINS[category];
  const maxDays = category === 'management-system' ? 7 : 14;
  const known = new Set(existingLinks.flatMap(link => { try { return [cleanUrl(link)]; } catch { return []; } }));
  const fetched = new Set();
  let unverifiable = 0;
  const verify = async (urls, limit, allowGrounding) => {
    const unique = [...new Set(urls)].filter(url => {
      if (fetched.has(url)) return false;
      try { return !known.has(cleanUrl(url)); } catch { return true; }
    }).slice(0, limit);
    for (const url of unique) fetched.add(url);
    const inspect = async url => {
      try {
        if (!allowGrounding) allowedUrl(url, domains);
        let date;
        const source = await fetchSource(url, domains, fetchImpl, publication => {
          if (known.has(publication.url)) return false;
          if (!publication.dates.length) throw new Error('No explicit publication date');
          log.info?.('  기관 원문 발행일 확인: ' + publication.dates.join(', ') + ' — ' + publication.url);
          date = freshDate(publication, today, maxDays);
          return Boolean(date);
        });
        return source && {...source, date};
      } catch (error) {
        unverifiable++;
        log.warn('  원문 후보 검증 실패: ' + error.message);
        return null;
      }
    };
    const resolved = [];
    if (category === 'product-certification' && !allowGrounding) {
      // The Commission list and its attachments share a host. Avoid bursts to that publisher.
      for (const url of unique) resolved.push(await inspect(url));
    } else {
      resolved.push(...await Promise.all(unique.map(inspect)));
    }
    const candidates = new Map();
    for (const source of resolved.filter(Boolean)) if (!candidates.has(source.url)) candidates.set(source.url, source);
    return [...candidates.values()];
  };
  let searchEmpty = false;
  if (!onlyOfficial) try {
    const discovery = await search();
    const links = groundedLinks(discovery);
    searchEmpty = discovery.report?.skip === true && !links.length;
    if (!searchEmpty && !links.length) throw new Error('Search response did not provide publisher evidence');
    const sources = await verify(links, 6, true);
    if (sources.length) return {sources, reason:'grounded'};
  } catch (error) {
    unverifiable++;
    log.warn('  검색 확인 실패: ' + error.message);
  }
  const indexes = officialIndexes(category, today);
  // A verified publisher list can still provide a scoped result if grounding failed.
  if (indexes.length) unverifiable = 0;
  let indexCount = 0;
  const lists = await Promise.all(indexes.map(async index => {
    try {
      const {html,url} = await fetchPublisherHtml(index.url, domains, fetchImpl);
      const links = publisherLinks(html, url, index.path, domains);
      if (!links.length) throw new Error('No article links found in the expected list format');
      indexCount++;
      return links.slice(0, 4);
    } catch (error) {
      unverifiable++;
      log.warn('  공식 목록 확인 실패: ' + new URL(index.url).hostname + ' — ' + error.message);
      return [];
    }
  }));
  const sources = await verify(lists.flat(), 10, false);
  if (sources.length) return {sources, reason:'publisher index'};
  if (unverifiable) throw new Error('Discovery incomplete: search or official source verification failed');
  return {sources:[], reason:indexCount ? 'no-new-verified-source-in-checked-lists' : searchEmpty ? 'search-returned-no-candidate' : 'no-new-verified-source'};
}

module.exports = { discoverSources, groundedLinks, publisherLinks };
