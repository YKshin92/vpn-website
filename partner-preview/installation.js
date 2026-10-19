const deviceButtons=[...document.querySelectorAll('[data-device]')];
deviceButtons.forEach(button=>button.addEventListener('click',()=>{
  deviceButtons.forEach(item=>{const active=item===button;item.setAttribute('aria-pressed',String(active));document.querySelector('#guide-'+item.dataset.device).hidden=!active;});
}));
document.querySelectorAll('.guide-wallet').forEach(button=>button.addEventListener('click',()=>document.querySelector('#account').click()));
