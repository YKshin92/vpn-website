import {readFile,writeFile} from 'node:fs/promises';
const p=new URL('./add-install-guide.mjs',import.meta.url);let source=await readFile(p,'utf8');
source=source.replace('<a class="apk-link" href="https://s3.amazonaws.com/outline-releases/client/android/stable/Outline-Client.apk" target="_blank" rel="noopener">공식 Android APK 다운로드 ↗</a>','<a class="apk-link" href="https://play.google.com/store/apps/details?id=org.outline.android.client" target="_blank" rel="noopener">Google Play를 이용할 수 있다면 스토어에서 설치 ↗</a>');
await writeFile(p,source);
