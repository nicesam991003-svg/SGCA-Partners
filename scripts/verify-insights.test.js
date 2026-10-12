const test = require('node:test');
const assert = require('node:assert/strict');
const { makeSnapshot, getInsightSourceLink, loadInsightSnapshot, verifiedPublishedCopy } = require('../js/insight-data');
const { publishedDocuments } = require('./build-site');
const { allowedUrl, fetchSource, verifyEvidence, publicationDates } = require('./source-verification');
const { saveToFirestore, validateApiConfiguration } = require('./generate-insight');
const { reportValues, savePayload } = require('../js/admin-editor');
const { isAdministrator } = require('../js/admin-auth');
const page = '<html><head><title>NIST publishes OT guide</title><meta property="article:published_time" content="2026-10-09"></head><main>' + 'NIST publishes new guidance for securing operational technology systems. '.repeat(5) + '</main></html>';

test('generator rejects a public Firebase key used as the Gemini secret without exposing key values', () => {
  const env = { GEMINI_API_KEY: 'private-gemini-example', FIREBASE_API_KEY: 'firebase-example', FIREBASE_PROJECT_ID: 'project-example' };
  assert.doesNotThrow(() => validateApiConfiguration(env, 'public-browser-example'));
  for (const key of ['firebase-example', 'public-browser-example']) {
    assert.throws(() => validateApiConfiguration({ ...env, GEMINI_API_KEY: ' ' + key + ' ' }, 'public-browser-example'), error => {
      assert.match(error.message, /Gemini/);
      assert.equal(error.message.includes(key), false);
      return true;
    });
  }
  assert.throws(() => validateApiConfiguration({ ...env, GEMINI_API_KEY: '' }, 'public-browser-example'), /환경변수/);
});

test('administrator UI requires the verified company Google identity', () => {
  const administrator = { email: 'sim@sgca-partners.com', emailVerified: true, providerData: [{ providerId: 'google.com' }] };
  assert.equal(isAdministrator(administrator), true);
  assert.equal(isAdministrator({ ...administrator, email: 'nicesam991003@gmail.com' }), false);
  assert.equal(isAdministrator({ ...administrator, emailVerified: false }), false);
  assert.equal(isAdministrator({ ...administrator, providerData: [{ providerId: 'password' }] }), false);
  assert.equal(isAdministrator(null), false);
});

test('public requests query only published reports; drafts require an authenticated administrator', async () => {
  const previous = { fetch: global.fetch, require: global.requireAdminAccess, headers: global.getInsightAuthHeaders };
  global.firebaseConfig = { projectId: 'demo-sgca', apiKey: 'example' };
  const calls = [];
  global.fetch = async (url, options) => { calls.push(options); return new Response(JSON.stringify([{ readTime: '2026-10-12T00:00:00Z' }])); };
  try {
    await loadInsightSnapshot();
    assert.equal(JSON.parse(calls[0].body).structuredQuery.where.fieldFilter.value.stringValue, 'published');
    assert.equal(calls[0].headers.Authorization, undefined);
    global.requireAdminAccess = async () => null;
    await assert.rejects(loadInsightSnapshot({ includeDrafts: true }), /sign in/);
    assert.equal(calls.length, 1);
    global.requireAdminAccess = async () => ({ email: 'sim@sgca-partners.com' });
    global.getInsightAuthHeaders = async () => ({ Authorization: 'Bearer simulated-token' });
    await loadInsightSnapshot({ includeDrafts: true });
    assert.equal(JSON.parse(calls[1].body).structuredQuery.where, undefined);
    assert.equal(calls[1].headers.Authorization, 'Bearer simulated-token');
  } finally { global.fetch = previous.fetch; global.requireAdminAccess = previous.require; global.getInsightAuthHeaders = previous.headers; }
});

test('server document decoding retains missing-date reports, sorts dates and preserves draft status', () => {
  const snapshot = makeSnapshot([
    { name: 'insights/old', fields: { createdAt: { timestampValue: '2026-09-01T00:00:00Z' }, sourceVerification: { mapValue: { fields: { status: { stringValue: 'verified' } } } } } },
    { name: 'insights/new', fields: { date: { stringValue: '2026-10-12' }, status: { stringValue: 'draft' } } }
  ]);
  assert.equal(snapshot.size, 2);
  assert.equal(snapshot.docs[0].id, 'new');
  assert.equal(snapshot.docs[0].data().status, 'draft');
  assert.equal(snapshot.docs[1].data().date, '2026-09-01');
  assert.equal(snapshot.docs[1].data().sourceVerification.status, 'verified');
});

function publicCopy(project = 'sgca-platform-7abbc') {
  return {projectId:project,generatedAt:new Date().toISOString(),documents:[{
    name:`projects/${project}/databases/(default)/documents/insights/verified`,
    fields:{status:{stringValue:'published'},title:{stringValue:'Verified report'},link:{stringValue:'https://nist.gov/news/verified'},
      sourceVerification:{mapValue:{fields:{status:{stringValue:'verified'},url:{stringValue:'https://nist.gov/news/verified'},translationAccurate:{booleanValue:true}}}}}
  }]};
}
test('a blocked browser API request can use only a fresh verified published copy', async () => {
  const original=global.fetch;global.firebaseConfig={projectId:'sgca-platform-7abbc'};let calls=[];
  global.fetch=async url=>{calls.push(url);if(url.startsWith('https://firestore.googleapis.com/'))throw new TypeError('Failed to fetch');return new Response(JSON.stringify(publicCopy()));};
  try {
    const snapshot=await loadInsightSnapshot({preferStatic:true});
    assert.equal(snapshot.size,1);assert.equal(snapshot.docs[0].data().status,'published');assert.ok(snapshot.generatedAt);
    assert.equal(calls.at(-1),'data/insights.json');assert.equal(calls.some(url=>url.includes('key=')),false);
  } finally {global.fetch=original;}
});
test('the published copy rejects stale, future, cross-project, draft and unverified content', () => {
  global.firebaseConfig={projectId:'sgca-platform-7abbc'};const copy=publicCopy();
  assert.equal(verifiedPublishedCopy(copy).size,1);
  assert.throws(()=>verifiedPublishedCopy({...copy,generatedAt:'2000-01-01T00:00:00Z'}),/out of date/);
  assert.throws(()=>verifiedPublishedCopy({...copy,generatedAt:new Date(Date.now()+86400000).toISOString()}),/out of date/);
  assert.throws(()=>verifiedPublishedCopy(publicCopy('other-project')),/out of date/);
  copy.documents[0].fields.status.stringValue='draft';assert.throws(()=>verifiedPublishedCopy(copy),/Invalid/);
  copy.documents[0].fields.status.stringValue='published';copy.documents[0].fields.sourceVerification.mapValue.fields.translationAccurate.booleanValue=false;
  assert.throws(()=>verifiedPublishedCopy(copy),/Unverified/);
});
test('permission failures do not silently switch an administrator or public request to a copy', async () => {
  const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;return new Response('{}',{status:403});};
  try {await assert.rejects(loadInsightSnapshot({preferStatic:true}),/403/);assert.equal(calls,1);}finally{global.fetch=original;}
});
test('the website export includes only verified published reports and strips unrelated fields', () => {
  const doc=publicCopy().documents[0];doc.fields.internalNote={stringValue:'not for public export'};
  const exported=publishedDocuments([{document:doc}]);assert.equal(exported.length,1);assert.equal(exported[0].fields.internalNote,undefined);
  doc.fields.status.stringValue='draft';assert.throws(()=>publishedDocuments([{document:doc}]),/private/);
});
test('no unverified, credential-bearing, unsafe or grounding links reach source buttons', () => {
  for (const link of ['#', 'javascript:alert(1)', 'http://cisa.gov/news', 'https://u:p@cisa.gov/news', 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/x']) assert.equal(getInsightSourceLink({ link }), '');
  assert.equal(getInsightSourceLink({ link: 'https://cisa.gov/news', sourceVerification: { status: 'review_required' } }), '');
  assert.equal(getInsightSourceLink({ link: 'https://cisa.gov/news' }), '');
  assert.equal(getInsightSourceLink({ link: 'https://cisa.gov/news', sourceVerification: { status: 'verified', url: 'https://cisa.gov/wrong' } }), '');
  assert.equal(getInsightSourceLink({ link: 'https://cisa.gov/news', sourceVerification: { status: 'verified', url: 'https://cisa.gov/news' } }), 'https://cisa.gov/news');
});
test('server failure and malformed response never resolve to an empty list', async () => {
  const original = global.fetch;
  global.firebaseConfig = { projectId: 'test', apiKey: 'test' };
  try {
    let calls = 0;
    global.fetch = async () => { calls++; return new Response('error', { status: 503 }); };
    await assert.rejects(loadInsightSnapshot(), /503/);
    assert.equal(calls, 2);
    global.fetch = async () => new Response('{}', { status: 200 });
    await assert.rejects(loadInsightSnapshot(), /Invalid/);
    global.fetch = async () => new Response(JSON.stringify([{ readTime: '2026-10-12T00:00:00Z' }]));
    assert.equal((await loadInsightSnapshot()).size, 0);
  } finally { global.fetch = original; }
});
test('source validation rejects misleading domains and redirects to nonpublishers', async () => {
  assert.throws(() => allowedUrl('https://cisa.gov.attacker.example/x', ['cisa.gov']));
  assert.throws(() => allowedUrl('https://127.0.0.1/x', ['cisa.gov']));
  await assert.rejects(fetchSource('https://cisa.gov/x', ['cisa.gov'], async () => new Response('', { status: 302, headers: { location: 'https://127.0.0.1/x' } })), /approved domains/);
});
test('grounding redirects resolve to a fetched publisher URL; HTTP 200 soft 404 is rejected', async () => {
  let calls = 0;
  const source = await fetchSource('https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc', ['nist.gov'], async () => ++calls === 1 ?
    new Response('', { status: 302, headers: { location: 'https://www.nist.gov/news/ot?utm_source=test' } }) :
    new Response(page, { headers: { 'content-type': 'text/html' } }));
  assert.equal(source.url, 'https://www.nist.gov/news/ot');
  assert.deepEqual(source.dates, ['2026-10-09']);
  await assert.rejects(fetchSource('https://nist.gov/x', ['nist.gov'], async () => new Response('<title>Page not found</title>' + page, { headers: { 'content-type': 'text/html' } })), /error or access/);
});
test('a valid URL alone is insufficient: exact title, quote and recent verified publication date are required', () => {
  const source = { url: 'https://nist.gov/news/ot', title: 'NIST publishes OT guide', text: 'NIST publishes new guidance for securing operational technology systems.', dates: ['2026-10-09'], sha256: 'test' };
  const report = { sourceTitle: source.title, sourceQuote: source.text, sourcePublishedDate: '2026-10-09' };
  assert.equal(verifyEvidence(report, source, '2026-10-12', 14).status, 'verified');
  assert.throws(() => verifyEvidence({ ...report, sourceQuote: 'Unrelated guidance about medical devices and healthcare systems.' }, source, '2026-10-12', 14), /quote/);
  assert.throws(() => verifyEvidence({ ...report, sourceTitle: 'Another report' }, source, '2026-10-12', 14), /title/);
  assert.throws(() => verifyEvidence({ ...report, sourcePublishedDate: '2026-10-11' }, source, '2026-10-12', 14), /date/);
  assert.throws(() => verifyEvidence(report, source, '2026-11-12', 14), /time window/);
  assert.deepEqual(publicationDates('<footer>Copyright 2026-10-12</footer>'), []);
});
test('storage rejects reports with no original, mismatched links or unchecked translations', async () => {
  await assert.rejects(saveToFirestore({ link: 'https://nist.gov/x' }), /Unverified/);
  await assert.rejects(saveToFirestore({ link: 'https://nist.gov/x', sourceVerification: { status: 'verified', url: 'https://nist.gov/x' } }), /Unverified/);
  await assert.rejects(saveToFirestore({ link: 'https://nist.gov/wrong', sourceVerification: { status: 'verified', translationAccurate: true, url: 'https://nist.gov/original' } }), /Unverified/);
});
test('editor fills every Korean and English field for both published reports and generated drafts', () => {
  const report = { id: 'existing', title: '한글 제목', titleEn: 'English title', category: 'cyber-security', date: '2026-10-12', link: 'https://nist.gov/news', desc: '요약', descEn: 'Summary', fullContent: '<p>본문</p>', fullContentEn: '<p>Body</p>', status: 'draft' };
  const values = reportValues(report);
  assert.equal(Object.keys(values).length, 9);
  assert.equal(values.fullContentEn, '<p>Body</p>');
  assert.equal(values.titleEn, 'English title');
  assert.equal(reportValues({ ...report, status: 'published' }).fullContent, '<p>본문</p>');
});
test('saving a draft stays draft without explicit approval; changed content invalidates previous review', () => {
  const values = reportValues({ title: '한글 제목', link: 'https://nist.gov/news' });
  const prior = { ...values, id: 'existing', status: 'draft', sourceVerification: { status: 'verified', url: values.link } };
  assert.equal(savePayload(values, prior, values, false).status, 'draft');
  assert.equal(savePayload(values, prior, values, true).status, 'published');
  const published = { ...prior, status: 'published' };
  assert.equal(savePayload(values, published, values, false).status, 'published');
  assert.equal(savePayload({ ...values, title: '수정 제목' }, published, values, false).status, 'draft');
  assert.equal(savePayload(values, null, null, false).status, 'draft');
});

test('reviewed edits preserve source identity and dates only for the same original URL', () => {
  const values = reportValues({title:'한글 제목',link:'https://nist.gov/news'});
  const prior = {...values,status:'published',sourceVerification:{status:'verified',url:values.link,title:'Original title',publishedDate:'2026-10-09',contentSha256:'old-hash'}};
  const saved = savePayload({...values,titleEn:'English title'},prior,values,true);
  assert.equal(saved.sourceVerification.title,'Original title');
  assert.equal(saved.sourceVerification.publishedDate,'2026-10-09');
  assert.equal(saved.sourceVerification.contentSha256,undefined);
  const changed = savePayload({...values,link:'https://nist.gov/other'},prior,values,true);
  assert.equal(changed.sourceVerification.title,undefined);
  assert.equal(changed.sourceVerification.publishedDate,undefined);
  const supplied = savePayload(values,prior,values,true,{title:'Reviewed title',publishedDate:'2026-10-10'});
  assert.equal(supplied.sourceVerification.title,'Reviewed title');
  assert.equal(supplied.sourceVerification.publishedDate,'2026-10-10');
});
