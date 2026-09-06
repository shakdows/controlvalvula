/* Actualizar sin depender de que salga el aviso. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1400,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(700);

 /* el botón está siempre, salga o no el aviso */
 const hay=await p.evaluate(()=>{const b=document.querySelector('#miActualizar');
   return b?{txt:b.textContent.replace(/\s+/g,' ').trim(),vis:getComputedStyle(b).display!=='none'}:null});
 chk(hay&&hay.vis,'el botón «Buscar actualización» está en el menú de la cuenta');
 chk(hay&&/Buscar actualización/.test(hay.txt),'y dice lo que hace · '+(hay||{}).txt);

 /* dice en qué versión está este equipo */
 const ver=await p.evaluate(async()=>{
   const orig=caches.keys.bind(caches);
   caches.keys=async()=>['adolphus-v99','adolphus-v115','otra-cosa'];
   const v=await versionInstalada();
   await pintarVersion(); await new Promise(r=>setTimeout(r,200));
   const t=(document.querySelector('#miVer')||{}).textContent;
   caches.keys=orig; return {v,t};
 });
 chk(ver.v==='v115','coge la caja más nueva del guardián · '+ver.v);
 chk(/v115/.test(ver.t||''),'y la enseña en el menú · '+ver.t);

 /* sin versión nueva: lo dice, y no recarga nada */
 const sin=await p.evaluate(async()=>{
   const msgs=[]; const t=window.toast; window.toast=m=>msgs.push(m);
   const kk=caches.keys.bind(caches); caches.keys=async()=>['adolphus-v115'];
   const gr=navigator.serviceWorker.getRegistration.bind(navigator.serviceWorker);
   navigator.serviceWorker.getRegistration=async()=>({update:async()=>{},waiting:null,installing:null});
   let recargo=false;
   await buscarActualizacion();
   window.toast=t; caches.keys=kk; navigator.serviceWorker.getRegistration=gr;
   return {msgs,recargo};
 });
 chk(sin.msgs.some(m=>/Ya tienes la última versión · v115/.test(m)),
     'sin versión nueva dice en cuál está · '+sin.msgs.join(' | '));

 /* con versión nueva esperando: la aplica */
 const con=await p.evaluate(async()=>{
   const msgs=[]; const t=window.toast; window.toast=m=>msgs.push(m);
   let aplico=false; const av=window.aplicarVersion; window.aplicarVersion=()=>{aplico=true};
   const gr=navigator.serviceWorker.getRegistration.bind(navigator.serviceWorker);
   navigator.serviceWorker.getRegistration=async()=>({update:async()=>{},waiting:{postMessage(){}},installing:null});
   HAY_VERSION=false;
   await buscarActualizacion();
   await new Promise(r=>setTimeout(r,500));
   const chip=!!document.querySelector('#btnActualizar');
   window.toast=t; window.aplicarVersion=av;
   navigator.serviceWorker.getRegistration=gr;
   return {msgs,aplico,chip};
 });
 chk(con.aplico,'con una versión esperando, la aplica');
 chk(con.msgs.some(m=>/Versión nueva lista/.test(m)),'y lo dice · '+con.msgs.join(' | '));
 chk(con.chip,'y enciende el botón negro de arriba');

 /* la banda repinta el botón aunque ya se supiera de la versión */
 const rep=await p.evaluate(()=>{
   HAY_VERSION=true;
   const b=document.querySelector('#btnActualizar'); if(b)b.remove();
   bandaVersion();
   return !!document.querySelector('#btnActualizar');
 });
 chk(rep,'si el aviso ya salió antes, el botón vuelve igual');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
