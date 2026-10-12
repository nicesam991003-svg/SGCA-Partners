const fs = require('node:fs/promises');
const path = require('node:path');
const {decodeFields, getInsightSourceLink} = require('../js/insight-data');
const projectId = 'sgca-platform-7abbc';
const fieldNames = ['title','titleEn','category','date','createdAt','link','desc','descEn','fullContent','fullContentEn','status','sourceVerification'];
function publishedDocuments(rows) {
  if (!Array.isArray(rows) || rows.some(r=>r.error || (!r.document && !r.readTime))) throw new Error('Invalid published report response');
  return rows.filter(r=>r.document).map(({document:doc})=>{
    const item=decodeFields(doc.fields || {});
    if (!doc.name?.startsWith(`projects/${projectId}/databases/(default)/documents/insights/`) || item.status !== 'published' || !getInsightSourceLink(item) || item.sourceVerification?.translationAccurate !== true) throw new Error('Unverified or private report in public export');
    return {name:doc.name,fields:Object.fromEntries(fieldNames.filter(k=>doc.fields[k]).map(k=>[k,doc.fields[k]]))};
  });
}
async function main() {
  const root=path.join(__dirname,'..'), output=path.resolve(root,process.env.SGCA_SITE_OUTPUT || '_site');
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,{
    method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),
    body:JSON.stringify({structuredQuery:{from:[{collectionId:'insights'}],where:{fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:{stringValue:'published'}}}}})
  });
  if (!response.ok) throw new Error(`Public export failed HTTP ${response.status}`);
  const documents=publishedDocuments(await response.json());
  await fs.mkdir(output,{recursive:true});
  for (const file of await fs.readdir(root)) if (file.endsWith('.html') && !file.startsWith('test')) await fs.copyFile(path.join(root,file),path.join(output,file));
  for (const file of ['CNAME','robots.txt','sitemap.xml','BingSiteAuth.xml']) await fs.copyFile(path.join(root,file),path.join(output,file));
  for (const dir of ['css','js','images']) await fs.cp(path.join(root,dir),path.join(output,dir),{recursive:true});
  await fs.mkdir(path.join(output,'data'),{recursive:true});
  await fs.writeFile(path.join(output,'data/insights.json'),JSON.stringify({projectId,generatedAt:new Date().toISOString(),documents}));
  console.log(`Site built with ${documents.length} verified published reports. No drafts or credentials exported.`);
}
module.exports={publishedDocuments};
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
