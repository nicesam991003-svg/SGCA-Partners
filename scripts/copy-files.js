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
  const enFilename = p + '-en.html';
  const jpFilename = p + '-jp.html';
  const cnFilename = p + '-cn.html';

  const enFilePath = path.join(workspaceDir, enFilename);
  const jpFilePath = path.join(workspaceDir, jpFilename);
  const cnFilePath = path.join(workspaceDir, cnFilename);

  // Copy to JP
  if (fs.existsSync(enFilePath)) {
    fs.copyFileSync(enFilePath, jpFilePath);
    console.log(`Copied ${enFilename} to ${jpFilename}`);
  } else {
    console.error(`Source file not found: ${enFilePath}`);
  }

  // Copy to CN
  if (fs.existsSync(enFilePath)) {
    fs.copyFileSync(enFilePath, cnFilePath);
    console.log(`Copied ${enFilename} to ${cnFilename}`);
  }
});
