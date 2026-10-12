(function (root) {
    'use strict';
    function decodeValue(value) {
        if ('stringValue' in value) return value.stringValue;
        if ('timestampValue' in value) return value.timestampValue;
        if ('booleanValue' in value) return value.booleanValue;
        if ('integerValue' in value) return Number(value.integerValue);
        if ('doubleValue' in value) return value.doubleValue;
        if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
        if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
        return null;
    }
    function decodeFields(fields) {
        return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
    }
    function makeSnapshot(documents) {
        const docs = documents.map(doc => {
            const data = decodeFields(doc.fields || {});
            data.date = typeof data.date === 'string' ? data.date.slice(0, 10) :
                (typeof data.createdAt === 'string' ? data.createdAt.slice(0, 10) : '');
            data.desc = typeof data.desc === 'string' ? data.desc : '';
            return { id: doc.name.split('/').pop(), data: () => data };
        }).sort((a, b) => b.data().date.localeCompare(a.data().date) || a.id.localeCompare(b.id));
        return { empty: docs.length === 0, size: docs.length, docs, forEach: fn => docs.forEach(fn) };
    }
    async function loadInsightSnapshot({ includeDrafts = false } = {}) {
        // REST queries are authoritative server reads; SDK cache/WebChannel transport is bypassed.
        // No orderBy: Firestore excludes documents lacking the ordered field.
        const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/(default)/documents:runQuery?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
        const query = { from: [{ collectionId: 'insights' }] };
        let authorization = {};
        if (includeDrafts) {
            if (!root.requireAdminAccess || !await root.requireAdminAccess()) throw new Error('Administrator sign in is required.');
            authorization = await root.getInsightAuthHeaders();
        } else {
            query.where = { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } };
        }
        let lastError;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...authorization },
                    body: JSON.stringify({ structuredQuery: query }),
                    signal: AbortSignal.timeout(15000)
                });
                if (!response.ok) throw new Error(`Insight server returned HTTP ${response.status}`);
                const rows = await response.json();
                if (!Array.isArray(rows) || rows.some(row => row.error || (!row.document && !row.readTime))) {
                    throw new Error('Invalid insight server response');
                }
                return makeSnapshot(rows.filter(row => row.document).map(row => row.document));
            } catch (error) { lastError = error; }
        }
        throw lastError; // A failed read must never become an empty report list.
    }
    async function loadInsightDocument(id) {
        if (!id || id.includes('/')) throw new Error('Invalid report ID');
        const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/(default)/documents/insights/${encodeURIComponent(id)}?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
        const authorization = root.getInsightAuthHeaders ? await root.getInsightAuthHeaders() : {};
        const response = await fetch(endpoint, { cache: 'no-store', headers: authorization, signal: AbortSignal.timeout(15000) });
        if (response.status === 404) throw new Error('해당 리포트를 찾을 수 없습니다. 삭제 여부와 주소를 확인하세요.');
        if (!response.ok) throw new Error(`리포트 조회 실패 (HTTP ${response.status})`);
        const doc = await response.json();
        if (!doc.name || !doc.fields) throw new Error('리포트 응답이 올바르지 않습니다.');
        return { ...decodeFields(doc.fields), id: doc.name.split('/').pop(), updateTime: doc.updateTime };
    }
    function getInsightSourceLink(item) {
        if (!item.sourceVerification || !['verified', 'manual_reviewed'].includes(item.sourceVerification.status) || item.link !== item.sourceVerification.url) return '';
        try {
            const url = new URL(item.link);
            if (url.protocol !== 'https:' || url.username || url.password ||
                url.hostname === 'vertexaisearch.cloud.google.com') return '';
            return url.href;
        } catch (_) { return ''; }
    }
    function showInsightSourceNotice(linkElement, item) {
        let notice = linkElement.parentElement.querySelector('.source-verification-notice');
        if (!notice) {
            notice = document.createElement('p');
            notice.className = 'source-verification-notice';
            notice.style.cssText = 'font-size:0.9rem;color:#93651f;margin:12px 0';
            linkElement.parentElement.appendChild(notice);
        }
        const language = document.documentElement.lang;
        const messages = {
            ko: '이 리포트는 원문 출처 확인이 필요합니다. 확인되지 않은 링크는 제공하지 않습니다.',
            en: 'The original source for this report needs review. An unverified link is unavailable.',
            ja: 'このレポートの原文出典は確認が必要です。未確認のリンクは表示しません。',
            zh: '此报告的原始来源需要核实，暂不提供未经核实的链接。'
        };
        notice.textContent = messages[language.split('-')[0]] || messages.en;
        notice.hidden = Boolean(getInsightSourceLink(item));
    }
    async function requireVerifiedInsight(id) {
        const doc = await root.db.collection('insights').doc(id).get({ source: 'server' });
        const item = doc.data();
        if (!item || !getInsightSourceLink(item) || item.sourceVerification?.translationAccurate !== true || !['verified', 'manual_reviewed'].includes(item.sourceVerification?.status) || item.link !== item.sourceVerification.url) {
            throw new Error('원문 출처를 확인한 뒤 관리자 편집 화면에서 승인하세요. / Verify the original source in the report editor before publication.');
        }
    }
    function showInsightLoadError(container) {
        const language = document.documentElement.lang.split('-')[0];
        const labels = {
            ko: ['리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', '다시 시도'],
            en: ['Unable to load reports. Please try again shortly.', 'Try again'],
            ja: ['レポートを読み込めませんでした。しばらくしてから再試行してください。', '再試行'],
            zh: ['报告加载失败，请稍后重试。', '重试']
        }[language] || ['Unable to load reports. Please try again shortly.', 'Try again'];
        container.replaceChildren();
        const message = document.createElement('p');
        message.style.cssText = 'text-align:center;padding:40px 0;color:#c77b3b';
        message.textContent = labels[0];
        const button = document.createElement('button');
        button.textContent = labels[1];
        button.style.cssText = 'display:block;margin:0 auto;padding:10px 20px;cursor:pointer';
        button.addEventListener('click', () => location.reload());
        container.append(message, button);
    }
    root.loadInsightSnapshot = loadInsightSnapshot;
    root.loadInsightDocument = loadInsightDocument;
    root.getInsightSourceLink = getInsightSourceLink;
    root.showInsightSourceNotice = showInsightSourceNotice;
    root.requireVerifiedInsight = requireVerifiedInsight;
    root.showInsightLoadError = showInsightLoadError;
    if (typeof module !== 'undefined') module.exports = { decodeFields, makeSnapshot, getInsightSourceLink, loadInsightSnapshot };
})(typeof window !== 'undefined' ? window : globalThis);
