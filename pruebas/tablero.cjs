/* El tablero se queda limpio; el informe de la OC no se pierde. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 /* una OC como las suyas, con una orden dentro */
 await p.evaluate(()=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'Kimberly-Clark Peru S.R.L.',ruc:'20100152941',fac:'Planta Puente Piedra'});
   ACTIVOS.push({id:'actT',cli:'cliT',tag:'PSV-106',ser:'2309001',mod:Object.keys(MODELOS)[0],
                 cr:'Alta',est:'En servicio'});
   PROYECTOS.push({id:'pyT',oc:'SOL19191919',cli:'cliT',tipo:'Correctivo',f:hoy,desc:''});
   ORDENES.push({id:'ordT',act:'actT',pry:'pyT',oc:'SOL19191919',mat:'PSV-106-001',
                 et:'oc',tipo:'Correctivo',f:hoy});
   renderAll();
 });
 await p.evaluate(()=>go('wo')); await p.waitForTimeout(400);

 const hayOC=await p.evaluate(()=>PROYECTOS.length);
 chk(hayOC>0,'hay OC en el equipo de prueba · '+hayOC);

 const panel=await p.evaluate(()=>document.querySelector('#pryPanel').innerHTML.trim());
 chk(panel==='','el cuadro de la OC ya no sale en el tablero');

 const tarjetas=await p.evaluate(()=>document.querySelectorAll('.py-card').length);
 chk(tarjetas===0,'ninguna tarjeta de OC en pantalla');

 const kb=await p.evaluate(()=>document.querySelectorAll('#kanban .kb-col').length
                              ||document.querySelectorAll('#kanban > *').length);
 chk(kb>0,'el tablero de abajo sigue ahí · '+kb+' columnas');

 const bt=await p.evaluate(()=>{const b=document.querySelector('#btnOCs');
   return {vis:b&&b.style.display!=='none',txt:b?b.textContent.trim():''}});
 chk(bt.vis,'el botón de informes por OC está encendido · «'+bt.txt+'»');

 /* la ventana trae lo de siempre */
 await p.click('#btnOCs'); await p.waitForTimeout(300);
 const dentro=await p.evaluate(()=>({
   abierta:document.querySelector('#modal').classList.contains('on'),
   fichas:document.querySelectorAll('#mBody .py-card').length,
   informe:!!document.querySelector('#mBody .py-acc button'),
   txt:document.querySelector('#mBody').textContent}));
 chk(dentro.abierta&&dentro.fichas>0,'la ventana trae las OC · '+dentro.fichas);
 chk(/Ver el informe/.test(dentro.txt),'sigue estando «Ver el informe»');
 chk(/Corregir/.test(dentro.txt),'sigue estando «Corregir»');
 chk(/Eliminar/.test(dentro.txt),'sigue estando «Eliminar»');

 /* y el informe se abre de verdad */
 await p.evaluate(()=>informeProyecto(PROYECTOS[0].id)); await p.waitForTimeout(500);
 const inf=await p.evaluate(()=>document.querySelector('#mBody').textContent);
 chk(/Avance del proyecto/i.test(inf)&&/SOL19191919/.test(inf)&&/1 de 1|0 de 1/.test(inf),
     'el informe de la OC se abre con su válvula dentro');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
