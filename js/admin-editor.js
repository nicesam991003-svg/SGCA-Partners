(function (root) {
    'use strict';
    const fields = ['title', 'titleEn', 'category', 'date', 'link', 'desc', 'descEn', 'fullContent', 'fullContentEn'];
    function reportValues(report) {
        return Object.fromEntries(fields.map(key => [key, typeof report[key] === 'string' && report[key] !== '#' ? report[key] : '']));
    }
    function savePayload(values, previous, baseline, reviewed) {
        const unchanged = previous && baseline && fields.every(key => values[key] === baseline[key]);
        let sourceVerification = unchanged ? previous.sourceVerification : null;
        if (reviewed && values.link) sourceVerification = { status: 'manual_reviewed', url: values.link, checkedAt: new Date().toISOString(), translationAccurate: true, method: 'editor-source-and-translation-review' };
        sourceVerification ||= { status: 'review_required', reason: 'Source or content requires review.' };
        const verified = values.link && sourceVerification.url === values.link && ['verified', 'manual_reviewed'].includes(sourceVerification.status);
        // Editing a draft never publishes it accidentally. Use the explicit review checkbox to publish.
        const status = verified && (reviewed || previous?.status === 'published') ? 'published' : 'draft';
        return { ...values, sourceVerification, status };
    }
    if (typeof module !== 'undefined') module.exports = { reportValues, savePayload };
    if (!root.document) return;
    document.addEventListener('DOMContentLoaded', async () => {
        const form = document.getElementById('admin-form');
        const submit = form.querySelector('[type=submit]');
        const status = document.getElementById('editor-load-status');
        const list = document.getElementById('post-list-container');
        const ids = { title: 'post-title', titleEn: 'post-title-en', category: 'post-category', date: 'post-date', link: 'post-link', desc: 'post-desc', descEn: 'post-desc-en' };
        let editing = null, baseline = null, loadRevision = 0;
        const busy = value => {
            form.querySelectorAll('input,select,textarea,button').forEach(control => { control.disabled = value; });
            form.setAttribute('aria-busy', String(value));
            if (root.quill) root.quill.enable(!value);
            if (root.quillEn) root.quillEn.enable(!value);
        };
        busy(true);
        document.getElementById('start-new-report').disabled = true;
        try {
            if (!await root.requireAdminAccess()) {
                status.textContent = '회사 Google 계정으로 관리자 로그인한 뒤 리포트를 편집할 수 있습니다.';
                list.textContent = '관리자 로그인이 필요합니다.';
                return;
            }
        } catch (error) { status.textContent = error.message; return; }
        document.getElementById('start-new-report').disabled = false;
        if (typeof Quill !== 'function') {
            status.textContent = '편집기를 불러오지 못했습니다. 새로고침해 주세요.';
            return;
        }
        const options = { theme: 'snow', modules: { toolbar: [[{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'], [{ color: [] }, { background: [] }], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']] } };
        const quill = new Quill('#editor-container', options);
        const quillEn = new Quill('#editor-container-en', options);
        root.quill = quill; root.quillEn = quillEn;
        function readValues() {
            const values = Object.fromEntries(Object.entries(ids).map(([key,id]) => [key, document.getElementById(id).value]));
            values.link = values.link.trim();
            values.fullContent = quill.getText().trim() || quill.root.querySelector('img') ? quill.root.innerHTML : '';
            values.fullContentEn = quillEn.getText().trim() || quillEn.root.querySelector('img') ? quillEn.root.innerHTML : '';
            return values;
        }
        function fillReport(report) {
            const values = reportValues(report);
            for (const [key,id] of Object.entries(ids)) document.getElementById(id).value = values[key];
            quill.clipboard.dangerouslyPasteHTML(values.fullContent);
            quillEn.clipboard.dangerouslyPasteHTML(values.fullContentEn);
            document.getElementById('source-reviewed').checked = false;
            baseline = readValues();
        }
        function startNew() {
            loadRevision++;
            editing = null; baseline = null;
            form.reset(); quill.setText(''); quillEn.setText('');
            document.getElementById('post-date').value = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
            history.replaceState(null, '', 'admin.html');
            status.textContent = '새 리포트를 직접 작성합니다.';
            submit.textContent = '새 리포트 저장';
            busy(false);
        }
        async function editReport(id) {
            const revision = ++loadRevision;
            busy(true);
            status.textContent = '리포트 내용을 불러오는 중입니다...';
            try {
                const report = await root.loadInsightDocument(id);
                if (revision !== loadRevision) return;
                editing = report;
                fillReport(report);
                history.replaceState(null, '', 'admin.html?edit=' + encodeURIComponent(id));
                status.textContent = report.status === 'draft' ? '자동 생성 초안을 불러왔습니다. 한글·영문 내용을 수정할 수 있습니다.' : '등록된 리포트를 불러왔습니다. 한글·영문 내용을 수정할 수 있습니다.';
                submit.textContent = '리포트 수정 저장';
                busy(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                if (revision !== loadRevision) return;
                editing = null; baseline = null;
                status.textContent = error.message + ' 새 리포트 작성 버튼으로 새 양식을 열 수 있습니다.';
                // Failed editing must not silently turn into creation of an empty report.
            }
        }
        async function refreshList() {
            try {
                const snapshot = await root.loadInsightSnapshot({ includeDrafts: true });
                list.replaceChildren();
                snapshot.forEach(doc => {
                    const report = doc.data();
                    const row = document.createElement('div'); row.className = 'admin-item';
                    const info = document.createElement('div'); info.className = 'admin-item-info';
                    const title = document.createElement('h4'); title.textContent = (report.status === 'draft' ? '[초안] ' : '') + (report.title || '제목 없음');
                    const description = document.createElement('p'); description.textContent = (report.date || '') + ' | ' + (report.desc || '').slice(0, 40);
                    info.append(title, description);
                    const actions = document.createElement('div'); actions.style.whiteSpace = 'nowrap';
                    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn-edit'; edit.textContent = '수정'; edit.dataset.id = doc.id; edit.addEventListener('click', () => editReport(doc.id));
                    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn-delete'; remove.textContent = '삭제';
                    remove.addEventListener('click', async () => {
                        if (!confirm('이 리포트를 삭제하시겠습니까? 삭제 후 되돌릴 수 없습니다.')) return;
                        try { await root.db.collection('insights').doc(doc.id).delete(); if (editing?.id === doc.id) startNew(); await refreshList(); }
                        catch (error) { alert('리포트를 삭제하지 못했습니다. 다시 시도해 주세요.'); }
                    });
                    actions.append(edit, remove); row.append(info, actions); list.appendChild(row);
                });
                if (snapshot.empty) list.textContent = '등록된 리포트가 없습니다.';
            } catch (error) { root.showInsightLoadError(list); }
        }
        document.getElementById('start-new-report').addEventListener('click', startNew);
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (submit.disabled) return;
            if (!root.db) { alert('저장 연결을 사용할 수 없습니다. 새로고침해 주세요.'); return; }
            const values = readValues();
            if (values.link && !root.getInsightSourceLink({ link: values.link, sourceVerification: { status: 'manual_reviewed', url: values.link } })) { alert('기관 원문 페이지의 HTTPS 주소를 입력하세요. 검색 중계 주소는 사용할 수 없습니다.'); return; }
            const payload = savePayload(values, editing, baseline, document.getElementById('source-reviewed').checked);
            busy(true);
            try {
                if (editing) {
                    // An existing report always updates its own ID; no implicit create fallback.
                    const current = await root.loadInsightDocument(editing.id);
                    if (current.updateTime !== editing.updateTime) throw new Error('다른 변경이 감지되었습니다. 리포트를 다시 불러온 뒤 수정해 주세요.');
                    await root.db.collection('insights').doc(editing.id).update(payload);
                    await editReport(editing.id);
                } else {
                    const created = await root.db.collection('insights').add({ ...payload, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                    await editReport(created.id);
                }
                await refreshList();
                alert(payload.status === 'published' ? '리포트가 저장 및 게시되었습니다.' : '초안으로 저장했습니다. 원문과 번역을 확인한 뒤 게시해 주세요.');
            } catch (error) { status.textContent = error.message || '저장하지 못했습니다. 다시 시도해 주세요.'; busy(false); }
        });
        const editId = new URLSearchParams(location.search).get('edit');
        if (editId) await editReport(editId); else startNew();
        await refreshList();
    });
})(typeof window !== 'undefined' ? window : globalThis);
