import {mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
// Explicit allowlist: do not publish backend-only administrator pages on GitHub Pages.
export const publicSiteFiles=['index.html','app.js','style.css','portal.css','portal.js','portal-model.mjs','practical.css','refinement.css','installation.css','installation.js','trial.css','server-admin.css','server-admin.js','server-model.mjs','demo-data.json','fonts.css','fonts/NotoSansKR-Variable.woff2','fonts/OFL.txt'];
export async function packagePublicSite(destination){await mkdir(destination);for(const file of publicSiteFiles){const output=path.join(destination,file);await mkdir(path.dirname(output),{recursive:true});await copyFile(new URL('../dist/'+file,import.meta.url),output);}return publicSiteFiles.length;}
if(process.argv[1]?.endsWith('package-public-site.mjs')){const destination=path.resolve('.pages-preview');await packagePublicSite(destination);console.log('Public website packaged; backend administrator assets excluded');}
