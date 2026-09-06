/* Al actualizar a mano se vuelve al inicio, a entrar otra vez. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1400,height:950}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>{
   const c=CUENTAS.find(x=>x.perfil==='admin');
   abrirSesion(c,true);                     // «recordar» puesto, como en su equipo
 });
 await p.waitForTimeout(600);
 await p.evaluate(()=>{CLIENTES.push({id:'cliT',n:'SAPE',areas:{a1:'Planta'}});renderAll();go('wo')});
 await p.waitForTimeout(300);

 /* se pide la actualización a mano, sin recargar de verdad */
 const marcas=await p.evaluate(async()=>{
   /* Se corta el camino a la recarga: así se puede mirar qué dejó
      apuntado sin que la página se vaya. */
   const orig=window.olvidarNotaVersion; let llamada=false;
   window.olvidarNotaVersion=()=>{llamada=true;return new Promise(()=>{})};
   aplicarVersion(true);
   await new Promise(r=>setTimeout(r,500));
   const s={donde:sessionStorage.getItem('adolphus.donde'),
            tras:sessionStorage.getItem('adolphus.tras-actualizar'), recargo:llamada};
   window.olvidarNotaVersion=orig;
   return s;
 });
 chk(marcas.tras,'queda apuntado que la actualización fue a mano · '+marcas.tras);
 chk(!marcas.donde,'y NO se apunta dónde estabas: se entra desde el principio');
 chk(marcas.recargo,'y sigue el camino de recargar el portal');

 /* la del aviso automático sí guarda el sitio */
 const auto=await p.evaluate(async()=>{
   sessionStorage.clear(); go('wo');
   const orig=window.olvidarNotaVersion;
   window.olvidarNotaVersion=()=>new Promise(()=>{});
   aplicarVersion();
   await new Promise(r=>setTimeout(r,400));
   const s={donde:sessionStorage.getItem('adolphus.donde'),
            tras:sessionStorage.getItem('adolphus.tras-actualizar')};
   window.olvidarNotaVersion=orig;
   return s;
 });
 chk(auto.donde&&/wo/.test(auto.donde),'el aviso automático sí te devuelve a tu sitio · '+auto.donde);
 chk(!auto.tras,'y ése no manda al inicio · interrumpir a media faena no se hace');

 /* y al volver de una actualización a mano: acceso abierto y aviso */
 await p.evaluate(()=>{sessionStorage.setItem('adolphus.tras-actualizar','v128')});
 await p.reload({waitUntil:'networkidle'});
 await p.waitForTimeout(1400);
 const vuelta=await p.evaluate(()=>({
   cover:document.querySelector('#cover').className,
   msg:document.querySelector('#authMsg').textContent.replace(/\s+/g,' ').trim(),
   tono:document.querySelector('#authMsg').className,
   sesion:(document.querySelector('#sessResume')||{}).textContent||'',
   marca:sessionStorage.getItem('adolphus.tras-actualizar')}));
 chk(!/gone/.test(vuelta.cover)&&/paso2/.test(vuelta.cover),
     'vuelve al inicio, con el acceso abierto · '+vuelta.cover);
 chk(/Portal actualizado/.test(vuelta.msg),'y lo dice · '+vuelta.msg.slice(0,70));
 chk(/good/.test(vuelta.tono),'en verde, no como un error');
 chk(/Continuar como/.test(vuelta.sesion),'con tu sesión lista de un toque · '+vuelta.sesion.slice(0,40));
 chk(!vuelta.marca,'la marca se gasta: no vuelve a salir en la siguiente recarga');

 /* una recarga normal no enseña nada de esto */
 await p.reload({waitUntil:'networkidle'});
 await p.waitForTimeout(1200);
 const normal=await p.evaluate(()=>({
   on:document.querySelector('#authMsg').classList.contains('on'),
   cover:document.querySelector('#cover').className}));
 chk(!normal.on,'una recarga normal no saca ningún aviso');
 chk(!/paso2/.test(normal.cover),'ni salta al acceso por su cuenta');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
