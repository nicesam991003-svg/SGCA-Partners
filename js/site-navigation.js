document.addEventListener('DOMContentLoaded', () => {
  const lang = document.documentElement.lang.split('-')[0];
  const words = {
    ko: ['메뉴 열기', '메뉴 닫기', '이전 슬라이드', '다음 슬라이드', '슬라이드 일시 정지', '슬라이드 재생', '원문 발행·갱신일', '리포트 등록일', '출처 확인일', '확인되지 않음', '공개 목록 동기화'],
    en: ['Open menu', 'Close menu', 'Previous slide', 'Next slide', 'Pause slideshow', 'Play slideshow', 'Source published/updated', 'Report registration', 'Source reviewed', 'Not verified', 'Published list synchronized'],
    ja: ['メニューを開く', 'メニューを閉じる', '前のスライド', '次のスライド', 'スライドを一時停止', 'スライドを再生', '原文公開・更新日', 'レポート登録日', '出典確認日', '未確認', '公開一覧の同期'],
    zh: ['打开菜单', '关闭菜单', '上一张幻灯片', '下一张幻灯片', '暂停幻灯片', '播放幻灯片', '原文发布/更新日期', '报告登记日期', '来源核实日期', '未核实', '公开列表同步时间']
  }[lang] || [];
  const nav = document.querySelector('nav');
  const bar = document.querySelector('.navbar .container');
  if (nav && bar) {
    nav.id = 'primary-navigation';
    const button = document.createElement('button');
    button.className = 'mobile-menu-btn'; button.type = 'button';
    button.innerHTML = '<span></span><span></span><span></span>';
    button.setAttribute('aria-controls', nav.id);
    bar.append(button);
    const mobile = matchMedia('(max-width: 992px)');
    function setMenu(open) {
      button.classList.toggle('active', open); nav.classList.toggle('active', open);
      button.setAttribute('aria-label', words[open ? 1 : 0]);
      button.setAttribute('aria-expanded', String(open));
      nav.inert = mobile.matches && !open;
      document.body.classList.toggle('navigation-open', mobile.matches && open);
    }
    button.addEventListener('click', () => setMenu(!nav.classList.contains('active')));
    nav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('active')) { setMenu(false); button.focus(); }
      if (event.key === 'Tab' && mobile.matches && nav.classList.contains('active')) {
        const links = [...nav.querySelectorAll('a[href]')];
        if (!event.shiftKey && document.activeElement === button) { event.preventDefault(); links[0]?.focus(); }
        else if (event.shiftKey && document.activeElement === links[0]) { event.preventDefault(); button.focus(); }
        else if (event.shiftKey && document.activeElement === button) { event.preventDefault(); links.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === links.at(-1)) { event.preventDefault(); button.focus(); }
      }
    });
    mobile.addEventListener('change', () => setMenu(false)); setMenu(false);
    const current = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('a[href]').forEach(link => {
      if (link.getAttribute('href').split('#')[0] === current) {
        link.classList.add('active');
        if (!link.getAttribute('href').includes('#')) link.setAttribute('aria-current', 'page');
      }
    });
  }
  document.querySelectorAll('a[href*="#"]').forEach(link => link.addEventListener('click', event => {
    const url = new URL(link.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    event.preventDefault(); target.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    history.pushState(null, '', url.hash);
  }));
  const slidesContainer = document.getElementById('slides-container');
  if (slidesContainer) {
    const slides = [...slidesContainer.querySelectorAll('.slide')];
    const prev = document.getElementById('prev-btn'), next = document.getElementById('next-btn');
    const pause = document.createElement('button'); pause.type = 'button'; pause.className = 'slider-btn pause';
    prev.setAttribute('aria-label', words[2]); next.setAttribute('aria-label', words[3]);
    document.querySelector('.slider-controls').append(pause);
    slidesContainer.setAttribute('aria-live', 'off');
    let current = 0, timer, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function render() {
      slidesContainer.style.transform = `translateX(-${current * 100}%)`;
      slides.forEach((slide, i) => { slide.inert = i !== current; slide.setAttribute('aria-hidden', String(i !== current)); });
    }
    function restart() {
      clearInterval(timer);
      pause.textContent = words[paused ? 5 : 4]; pause.setAttribute('aria-label', pause.textContent);
      pause.setAttribute('aria-pressed', String(paused));
      if (!paused && !document.hidden) timer = setInterval(() => { current = (current + 1) % slides.length; render(); }, 5000);
    }
    prev.addEventListener('click', () => { current = (current + slides.length - 1) % slides.length; render(); restart(); });
    next.addEventListener('click', () => { current = (current + 1) % slides.length; render(); restart(); });
    let pauseBeforePointer;
    pause.addEventListener('pointerdown', () => { pauseBeforePointer = paused; });
    pause.addEventListener('click', event => {
      // Focus also pauses the carousel; a first mouse click must not undo that pause.
      paused = event.detail > 0 && pauseBeforePointer !== undefined ? !pauseBeforePointer : !paused;
      pauseBeforePointer = undefined;
      restart();
    });
    slidesContainer.closest('.hero-slider').addEventListener('focusin', () => { paused = true; restart(); });
    document.addEventListener('visibilitychange', restart); render(); restart();
  }
  const modal = document.getElementById('insightModal');
  if (modal && window.openInsightModal) {
    const originalOpen = window.openInsightModal, originalClose = window.closeInsightModal;
    let previousFocus, previousUrl;
    const oldDisplay = modal.style.display;
    function isOpen() { return getComputedStyle(modal).display !== 'none'; }
    function formatDate(value) {
      if (!value) return words[9];
      const date = new Date(value);
      return Number.isNaN(date.valueOf()) ? words[9] : date.toLocaleDateString(document.documentElement.lang, {timeZone:'Asia/Seoul'});
    }
    function showProvenance(item) {
      const box = document.getElementById('modalProvenance'); if (!box) return;
      const values = [item.sourceVerification?.publishedDate, item.createdAt, item.sourceVerification?.checkedAt];
      box.replaceChildren();
      values.forEach((value, i) => { const line = document.createElement('p'); line.textContent = `${words[6+i]}: ${formatDate(value)}`; box.append(line); });
    }
    window.openInsightModal = function(id, {fromUrl = false} = {}) {
      const link = document.querySelector(`[data-report-id="${CSS.escape(encodeURIComponent(id))}"]`);
      const item = window.latestPublicSnapshot?.docs.find(doc=>doc.id===id)?.data();
      previousFocus = document.activeElement;
      previousUrl = location.href;
      originalOpen(id);
      if (!isOpen()) return;
      if (item) showProvenance(item);
      else window.loadInsightDocument(id).then(showProvenance).catch(() => {});
      if (!fromUrl) { const url = new URL(location.href); url.searchParams.set('report', id); history.pushState({sgcaReport:true}, '', url); }
      document.body.classList.add('report-open');
      document.querySelectorAll('body > *').forEach(element => { if (element !== modal && !element.contains(modal)) element.inert = true; });
      modal.querySelector('.insight-modal-close').focus();
    };
    window.closeInsightModal = function() {
      originalClose(); document.body.classList.remove('report-open');
      document.querySelectorAll('body > *').forEach(element => { element.inert = false; });
      if (previousUrl && !new URL(previousUrl).searchParams.has('report')) history.replaceState(null, '', previousUrl);
      else { const url = new URL(location.href); url.searchParams.delete('report'); history.replaceState(null, '', url); }
      previousFocus?.focus();
    };
    document.addEventListener('click', event => {
      const link = event.target.closest('a[data-report-id]');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
      event.preventDefault(); window.openInsightModal(decodeURIComponent(link.dataset.reportId));
    });
    modal.addEventListener('click', event => { if (event.target === modal) window.closeInsightModal(); });
    document.addEventListener('keydown', event => {
      if (!isOpen()) return;
      if (event.key === 'Escape') { event.preventDefault(); window.closeInsightModal(); }
      if (event.key === 'Tab') {
        const focusable = [...modal.querySelectorAll('button,a[href],input,textarea,select,[tabindex="0"]')].filter(e=>e.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
    window.addEventListener('popstate', () => { if (isOpen()) window.closeInsightModal(); });
    const report = new URL(location.href).searchParams.get('report');
    if (report) {
      let done = false, expanded = false;
      const observer = new MutationObserver(() => {
        if (done) return;
        if (!document.querySelector(`[data-report-id="${CSS.escape(encodeURIComponent(report))}"]`)) {
          if (!expanded && document.querySelector('.rss-card') && typeof window.renderInsightCards === 'function') { expanded=true; window.renderInsightCards(1000); }
          return;
        }
        done = true; observer.disconnect(); window.openInsightModal(report, {fromUrl:true});
      });
      observer.observe(document.body, {childList:true, subtree:true});
      // A link to a report beyond the initial six also loads through the verified public source.
      window.loadInsightSnapshot({preferStatic:true}).then(snapshot => {
        const item = snapshot.docs.find(doc=>doc.id===report); if (!item || done) return;
        if (typeof window.renderInsightCards === 'function') window.renderInsightCards(snapshot.size);
        else {
          done = true; observer.disconnect();
          const data=item.data();
          if (Array.isArray(window.allInsights) && !window.allInsights.some(item=>item.id===report)) window.allInsights.push({id:report,...data});
          window.openInsightModal(report,{fromUrl:true});
        }
      }).catch(()=>{});
    }
  }
  window.addEventListener('insight-snapshot', event => {
    if (!event.detail.generatedAt) return;
    const target = document.getElementById('rss-feed-container') || document.getElementById('main-rss-feed-container');
    if (!target) return;
    let note = document.querySelector('.snapshot-freshness');
    if (!note) { note = document.createElement('p'); note.className = 'snapshot-freshness'; target.before(note); }
    note.textContent = `${words[10]}: ${new Date(event.detail.generatedAt).toLocaleString(document.documentElement.lang, {timeZone:'Asia/Seoul'})} (KST)`;
  });
});
