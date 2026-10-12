const { before, after, test } = require('node:test');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc } = require('firebase/firestore');
let environment;
const report = { title: 'Verified example', category: 'cyber-security', date: '2026-10-12', status: 'published', link: 'https://www.cisa.gov/example', sourceVerification: { status: 'verified', url: 'https://www.cisa.gov/example', translationAccurate: true } };
const ownerToken = { email: 'sim@sgca-partners.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } };
before(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-sgca-security', firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync('firestore.rules', 'utf8') } });
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'insights/published'), report);
    await setDoc(doc(db, 'insights/draft'), { ...report, status: 'draft' });
  });
});
after(async () => { await environment?.cleanup(); });
test('public reads expose published reports only; an unfiltered query and draft read fail', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDocs(query(collection(db, 'insights'), where('status', '==', 'published'))));
  await assertSucceeds(getDoc(doc(db, 'insights/published')));
  await assertFails(getDocs(collection(db, 'insights')));
  await assertFails(getDoc(doc(db, 'insights/draft')));
});
test('anonymous clients cannot create, update, or delete reports', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, 'insights/anonymous'), report));
  await assertFails(updateDoc(doc(db, 'insights/published'), { title: 'Forged content' }));
  await assertFails(deleteDoc(doc(db, 'insights/draft')));
});
test('personal, unverified, and non-Google identities are denied administrator access', async () => {
  const tokens = [
    { ...ownerToken, email: 'nicesam991003@gmail.com' },
    { ...ownerToken, email_verified: false },
    { ...ownerToken, firebase: { sign_in_provider: 'password' } }
  ];
  for (let i = 0; i < tokens.length; i++) {
    const db = environment.authenticatedContext('other-' + i, tokens[i]).firestore();
    await assertFails(getDoc(doc(db, 'insights/draft')));
    await assertFails(setDoc(doc(db, 'insights/not-authorized-' + i), report));
  }
});
test('verified company Google administrator can read drafts and manage valid reports', async () => {
  const db = environment.authenticatedContext('company-administrator', ownerToken).firestore();
  await assertSucceeds(getDocs(collection(db, 'insights')));
  await assertSucceeds(getDoc(doc(db, 'insights/draft')));
  await assertSucceeds(setDoc(doc(db, 'insights/owner-example'), report));
  await assertSucceeds(updateDoc(doc(db, 'insights/owner-example'), { title: 'Reviewed correction' }));
  await assertSucceeds(deleteDoc(doc(db, 'insights/owner-example')));
});
test('administrator cannot publish without a matching verified source and translation review', async () => {
  const db = environment.authenticatedContext('company-administrator', ownerToken).firestore();
  await assertFails(setDoc(doc(db, 'insights/unverified'), { ...report, sourceVerification: { status: 'review_required' } }));
  await assertFails(setDoc(doc(db, 'insights/mismatch'), { ...report, link: 'https://www.cisa.gov/another' }));
  await assertFails(setDoc(doc(db, 'insights/untranslated'), { ...report, sourceVerification: { ...report.sourceVerification, translationAccurate: false } }));
  await assertSucceeds(setDoc(doc(db, 'insights/owner-draft'), { ...report, status: 'draft', sourceVerification: { status: 'review_required' } }));
});
