import {readFile,writeFile} from 'node:fs/promises';
const p=new URL('../dist/index.html',import.meta.url);
let html=await readFile(p,'utf8');
html=html.replace('<title>이음 VPN — 나의 일상과 이어지다</title>','<title>이음 VPN — 중국 생활을 위한 VPN 이용권</title>');
const hero=`<main id="home"><section class="hero practical-hero"><div class="hero-copy"><span class="service-label">중국 거주자를 위한 VPN 이용권</span><h1>신청부터 이용권 관리까지<br>필요한 기간만큼<br><em>이음 VPN</em></h1><p>Outline 앱으로 연결하고,<br>내 이용권에서 접속 키와 만료일을 확인하세요</p><div class="hero-actions"><a class="button primary" href="#plans">요금제 보기</a><a class="button outline" href="#guide">설치 방법</a></div><p class="hero-note">기간권 구매 · 자동 갱신 없음 · 고객별 접속 키</p></div><aside class="quick-plan" aria-label="이용권 요약"><span class="label">30일 이용권 · 예시 요금</span><div class="quick-price">12,000<span>원</span></div><p>총 결제금액 기준입니다<br>정기결제 없이 직접 구매하고 연장합니다</p><dl><div><dt>연결 앱</dt><dd>Outline Client</dd></div><div><dt>접속 정보</dt><dd>고객별 개별 키</dd></div><div><dt>이용권 관리</dt><dd>키 확인 · 만료일 · 연장</dd></div></dl><button class="primary full" data-plan="30">30일 이용권 선택</button><small>현재는 실제 청구 없는 디자인 데모입니다</small></aside></section>
<div class="service-context"><strong>이용 전 확인하세요</strong><p>중국의 지역·통신망에 따라 접속이 제한될 수 있습니다 가격·기기 수·지원 및 환불 정책은 출시 전 확정됩니다</p><a href="#faq">이용 안내</a></div>`;
html=html.replace(/<main id="home"><section class="hero">[\s\S]*?<\/section>/,hero);
const plans=`<section class="plans" id="plans"><div class="section-head"><div><h2>이용기간을 선택하세요</h2><p>기능은 동일합니다 필요한 기간과 총 결제금액을 비교하세요</p></div><span class="pricing-note">가격은 검토용 예시입니다</span></div><div class="plan-grid">${[[30,12000,'짧은 체류 또는 첫 이용'],[90,30000,'학업과 업무로 머무를 때'],[180,54000,'장기 체류를 계획할 때']].map(([days,price,desc])=>`<article class="plan"><h3>${days}일</h3><p>${desc}</p><div class="price">${price.toLocaleString('ko-KR')}<span>원</span></div><p class="total-label">한 번 결제 · ${days}일 이용</p><button class="outline" data-plan="${days}">${days}일 선택</button></article>`).join('')}</div><div class="included"><h3>모든 이용권에 동일하게 제공</h3><ul><li>고객별 Outline 접속 키</li><li>내 이용권에서 키·만료일 확인</li><li>필요할 때 직접 기간 연장</li></ul></div><details class="policy-details"><summary>구매 전 확인할 사항</summary><dl><div><dt>기기 수·동시 접속·트래픽</dt><dd>출시 전 확정 예정</dd></div><div><dt>이용기간 시작 기준</dt><dd>출시 전 확정 예정</dd></div><div><dt>고객 지원 채널·응대 시간</dt><dd>출시 전 확정 예정</dd></div><div><dt>환불·장애 보상</dt><dd>정책 확정 후 구매 화면에 안내</dd></div></dl></details></section>`;
html=html.replace(/<section class="plans" id="plans">[\s\S]*?<\/section>/,plans);
html=html.replace('<div class="eyebrow">BUILT ON OUTLINE</div><h2 id="outline-title">간단한 시작<br>공개된 기술을 바탕으로</h2>','<h2 id="outline-title">Outline으로 어떻게 연결하나요?</h2>');
html=html.replace('이음은 Outline 기술을 이용합니다<br>연결의 기반도 알고 선택하세요','이음은 서버와 이용권을 관리합니다<br>기기에서는 Outline 앱으로 연결합니다');
html=html.replaceAll('01 / EASY TO START','앱 이용').replaceAll('02 / OPEN SOURCE','기술 공개').replaceAll('03 / YOUR DEVICES','지원 기기').replaceAll('04 / RESILIENT BY DESIGN','연결 방식');
html=html.replace('<div class="eyebrow">GET CONNECTED</div><h2>처음이라도,<br>세 단계면 충분해요</h2><p>복잡한 설정 대신 순서대로 따라오세요</p>','<h2>Outline 앱 설치와 연결</h2><p>앱 설치 후 접속 키를 등록하세요</p>');
html=html.replace('체류 일정에 맞는 기간을 선택합니다','체류 일정에 맞는 기간을 선택합니다 현재 화면에서는 데모 주문을 체험할 수 있습니다');
html=html.replace('<div class="eyebrow">A LITTLE HELP</div>','');
html=html.replace('</main>','<details class="demo-workbench"><summary>디자인 검토용 체험 도구</summary><p>가상 고객을 선택해 내 이용권을 확인하거나 관리자 화면을 체험하세요 이 영역은 출시 화면에서 제외됩니다</p><div id="demo-tools"></div></details></main>');
html=html.replace('</head>','<link rel="stylesheet" href="practical.css"></head>');
await writeFile(p,html);
