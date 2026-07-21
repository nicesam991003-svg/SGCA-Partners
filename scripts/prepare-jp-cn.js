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

  const jpFilePath = path.join(workspaceDir, jpFilename);
  const cnFilePath = path.join(workspaceDir, cnFilename);

  // 1. Prepare JP File
  if (fs.existsSync(jpFilePath)) {
    let content = fs.readFileSync(jpFilePath, 'utf8');

    // lang="en" -> lang="ja"
    content = content.replace(/<html lang="en">/i, '<html lang="ja">');

    // Inject Noto Sans JP Google Font before </head> if not already present
    if (!content.includes('fonts.googleapis.com') && !content.includes('Noto Sans JP')) {
      const jpFontHtml = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        body, button, input, select, textarea {
            font-family: 'Noto Sans JP', 'Pretendard', sans-serif !important;
        }
    </style>
</head>`;
      content = content.replace(/<\/head>/i, jpFontHtml);
    }

    // Active lang JP in language selector
    const selectorJpActive = `            <div class="language-selector">
                <a href="${krFilename}" class="lang-btn">KR</a> | 
                <a href="${enFilename}" class="lang-btn">EN</a> | 
                <a href="${jpFilename}" class="lang-btn active">JP</a> | 
                <a href="${cnFilename}" class="lang-btn">CN</a>
            </div>`;
    content = content.replace(/<div class="language-selector">[\s\S]*?<\/div>/i, selectorJpActive);

    // Swap links: href="*-en.html" (relative) to href="*-jp.html"
    const linkRegex = /href="(?!\s*https?:\/\/)(index|company-intro|management-system|product-certification|specialized-sectors|insights)-en\.html"/gi;
    content = content.replace(linkRegex, 'href="$1-jp.html"');

    // Swap canonical URL in head (which contains https://)
    const canonicalSearch = new RegExp(`https://sgca-partners.com/(${p === 'index' ? 'index-en.html' : p + '-en.html'})`, 'i');
    content = content.replace(canonicalSearch, `https://sgca-partners.com/${p === 'index' ? 'index-jp.html' : p + '-jp.html'}`);

    fs.writeFileSync(jpFilePath, content, 'utf8');
    console.log(`Prepared JP structure: ${jpFilename}`);
  }

  // 2. Prepare CN File
  if (fs.existsSync(cnFilePath)) {
    let content = fs.readFileSync(cnFilePath, 'utf8');

    // lang="en" -> lang="zh-Hans"
    content = content.replace(/<html lang="en">/i, '<html lang="zh-Hans">');

    // Inject Noto Sans SC Google Font before </head> if not already present
    if (!content.includes('fonts.googleapis.com') && !content.includes('Noto Sans SC')) {
      const cnFontHtml = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        body, button, input, select, textarea {
            font-family: 'Noto Sans SC', 'Pretendard', sans-serif !important;
        }
    </style>
</head>`;
      content = content.replace(/<\/head>/i, cnFontHtml);
    }

    // Active lang CN in language selector
    const selectorCnActive = `            <div class="language-selector">
                <a href="${krFilename}" class="lang-btn">KR</a> | 
                <a href="${enFilename}" class="lang-btn">EN</a> | 
                <a href="${jpFilename}" class="lang-btn">JP</a> | 
                <a href="${cnFilename}" class="lang-btn active">CN</a>
            </div>`;
    content = content.replace(/<div class="language-selector">[\s\S]*?<\/div>/i, selectorCnActive);

    // Swap links: href="*-en.html" (relative) to href="*-cn.html"
    const linkRegex = /href="(?!\s*https?:\/\/)(index|company-intro|management-system|product-certification|specialized-sectors|insights)-en\.html"/gi;
    content = content.replace(linkRegex, 'href="$1-cn.html"');

    // Swap canonical URL in head (which contains https://)
    const canonicalSearch = new RegExp(`https://sgca-partners.com/(${p === 'index' ? 'index-en.html' : p + '-en.html'})`, 'i');
    content = content.replace(canonicalSearch, `https://sgca-partners.com/${p === 'index' ? 'index-cn.html' : p + '-cn.html'}`);

    fs.writeFileSync(cnFilePath, content, 'utf8');
    console.log(`Prepared CN structure: ${cnFilename}`);
  }
});
