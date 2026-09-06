const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1300,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(900);
 let mal=0; const juzga=(ok,t)=>{console.log((ok?'✓':'✗')+' '+t); if(!ok)mal++};

 let r=await p.evaluate(()=>({chip:!!document.getElementById('btnActualizar')}));
 juzga(!r.chip,'1 · sin versión nueva no hay botón de actualizar');

 r=await p.evaluate(()=>{ bandaVersion();
   return {banda:!!document.getElementById('bandaVer'),
           chip:!!document.getElementById('btnActualizar')}});
 juzga(r.banda&&r.chip,'2 · llega la versión: sale la banda Y el botón de arriba');

 r=await p.evaluate(()=>{
   [...document.querySelectorAll('#bandaVer button')].find(x=>/Después/.test(x.textContent)).click();
   return {banda:!!document.getElementById('bandaVer'),
           chip:!!document.getElementById('btnActualizar'),
           texto:(document.getElementById('btnActualizar')||{}).textContent};
 });
 juzga(!r.banda&&r.chip,'3 · «Después» aparta la banda pero DEJA el botón · "'+(r.texto||'')+'"');

 // y sigue ahí tras navegar y repintar, que era lo que se perdía
 r=await p.evaluate(()=>{ go('wo'); renderAll(); go('home');
   return {chip:!!document.getElementById('btnActualizar')}});
 juzga(r.chip,'4 · sigue ahí después de moverse por el portal');

 // y desaparece sólo cuando se aplica
 r=await p.evaluate(()=>{ HAY_VERSION=false; pintarActualizar();
   return {chip:!!document.getElementById('btnActualizar')}});
 juzga(!r.chip,'5 · se va cuando la versión se aplica');

 console.log('errores JS:', errs.length?errs.join(' | '):'ninguno');
 console.log(mal?mal+' fallo(s)':'los cinco pasan');
 await b.close();
})();
