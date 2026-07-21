const fs = require('fs');
const path = require('path');

const pages = [
  'index',
  'company-intro',
  'management-system',
  'product-certification',
  'specialized-sectors',
  'insights'
];

const workspaceDir = path.resolve(__dirname, '..');

pages.forEach(p => {
  const krFilename = p + '.html';
  const enFilename = p + '-en.html';
  const jpFilename = p + '-jp.html';
  const cnFilename = p + '-cn.html';

  const krFilePath = path.join(workspaceDir, krFilename);
  const enFilePath = path.join(workspaceDir, enFilename);
  const jpFilePath = path.join(workspaceDir, jpFilename);
  const cnFilePath = path.join(workspaceDir, cnFilename);

  const krUrl = p === 'index' ? 'https://sgca-partners.com/' : `https://sgca-partners.com/${p}.html`;
  const enUrl = p === 'index' ? 'https://sgca-partners.com/index-en.html' : `https://sgca-partners.com/${p}-en.html`;
  const jpUrl = p === 'index' ? 'https://sgca-partners.com/index-jp.html' : `https://sgca-partners.com/${p}-jp.html`;
  const cnUrl = p === 'index' ? 'https://sgca-partners.com/index-cn.html' : `https://sgca-partners.com/${p}-cn.html`;

  const newSeoBlock = (canonicalUrl) => `    <!-- SEO & Localization -->
    <link rel="canonical" href="${canonicalUrl}">
    <link rel="alternate" hreflang="ko" href="${krUrl}">
    <link rel="alternate" hreflang="en" href="${enUrl}">
    <link rel="alternate" hreflang="ja" href="${jpUrl}">
    <link rel="alternate" hreflang="zh-Hans" href="${cnUrl}">
    <link rel="alternate" hreflang="x-default" href="${krUrl}">`;

  const getLanguageSelector = (activeLang) => {
    const krActive = activeLang === 'kr' ? ' active' : '';
    const enActive = activeLang === 'en' ? ' active' : '';
    const jpActive = activeLang === 'jp' ? ' active' : '';
    const cnActive = activeLang === 'cn' ? ' active' : '';

    return `            <div class="language-selector">
                <a href="${krFilename}" class="lang-btn${krActive}">KR</a> | 
                <a href="${enFilename}" class="lang-btn${enActive}">EN</a> | 
                <a href="${jpFilename}" class="lang-btn${jpActive}">JP</a> | 
                <a href="${cnFilename}" class="lang-btn${cnActive}">CN</a>
            </div>`;
  };

  // Helper function to update a file
  function updateFile(filePath, lang, canonicalUrl) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Replace SEO section
    // Match <!-- SEO & Localization --> followed by <link ...> elements
    const seoRegex = /<!-- SEO & Localization -->[\s\S]*?(?:<\/head>|(?:\r?\n){2,})/i;
    if (seoRegex.test(content)) {
      content = content.replace(seoRegex, (match) => {
        // Keep the closing tag of head if matched
        const hasCloseHead = match.toLowerCase().includes('</head>');
        return newSeoBlock(canonicalUrl) + (hasCloseHead ? '\n</head>' : '\n');
      });
    } else {
      console.warn(`SEO section not matched in ${filePath}`);
    }

    // 2. Replace language selector
    const langSelectorRegex = /<div class="language-selector">[\s\S]*?<\/div>/i;
    if (langSelectorRegex.test(content)) {
      content = content.replace(langSelectorRegex, getLanguageSelector(lang));
    } else {
      console.warn(`Language selector not matched in ${filePath}`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }

  // Update Korean, English, Japanese, and Chinese files
  updateFile(krFilePath, 'kr', krUrl);
  updateFile(enFilePath, 'en', enUrl);
  updateFile(jpFilePath, 'jp', jpUrl);
  updateFile(cnFilePath, 'cn', cnUrl);
});
