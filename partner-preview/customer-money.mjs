// Prices in won and yuan (decided 2026-11-07): the 30-day pass is 10,000원 or 50元; 90 days is the monthly price
// less 10% (27,000원 · 135元) and 180 days less 20% (48,000원 · 240元); adding 10GB is 3,000원 · 15元.
// - each payment method charges one currency: WeChat Pay and Alipay in yuan, KakaoPay and bank transfer in won
// - fixed prices, not an exchange-rate conversion
// - amounts are kept in minor units: won has none, yuan has 100 fen (50元 = 5000)
// - yuan is written with the character 元 (requested 2026-11-07); English uses "CNY 50"
// The server catalog (backend/customer-payment-order-mock.ts) and the home page cards carry the same numbers
// (tests/customer-money.test.mjs keeps them equal).
export const prices=Object.freeze({
 plans:Object.freeze({30:Object.freeze({KRW:10000,CNY:5000}),90:Object.freeze({KRW:27000,CNY:13500}),180:Object.freeze({KRW:48000,CNY:24000})}),
 topup:Object.freeze({KRW:3000,CNY:1500})
});
export const methodCurrency=Object.freeze({wechat_pay:'CNY',alipay:'CNY',kakao_pay:'KRW',bank_transfer:'KRW'});
export const minorUnits=Object.freeze({KRW:0,CNY:2});
export const currencyOf=method=>methodCurrency[method]??'KRW';
const lang=value=>value==='zh-CN'||value==='zh'?'zh':['en','ja','ko'].includes(value)?value:'ko';
// 10000 KRW → "10,000원" (ko) or "₩10,000"; 5000 CNY → "50元" or "CNY 50"; 2834 CNY → "28.34元".
export function formatMoney(amountMinor,currency='KRW',language='ko'){
 const l=lang(language),n=Number(amountMinor);
 if(!Number.isFinite(n))return '—';
 if(currency==='CNY'){const v=n/100,s=v.toLocaleString('en-US',Number.isInteger(v)?{maximumFractionDigits:0}:{minimumFractionDigits:2,maximumFractionDigits:2});return l==='en'?'CNY '+s:s+'元';}
 return l==='ko'?n.toLocaleString('ko-KR')+'원':new Intl.NumberFormat(l==='zh'?'zh-CN':l,{style:'currency',currency:'KRW'}).format(n);
}
// Both prices of a product: "10,000원 · 50元".
export function formatBoth(price,language='ko'){
 return [price?.KRW!==undefined?formatMoney(price.KRW,'KRW',language):null,price?.CNY!==undefined?formatMoney(price.CNY,'CNY',language):null].filter(Boolean).join(' · ');
}
// For an amount field shown in won or yuan: minor units ↔ the number typed (yuan with 2 decimals).
export const toMajor=(amountMinor,currency)=>currency==='CNY'?Number((Number(amountMinor)/100).toFixed(2)):Number(amountMinor);
export const toMinor=(value,currency)=>currency==='CNY'?Math.round(Number(value)*100):Math.trunc(Number(value));
