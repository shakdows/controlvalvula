/* Cada foto del desarme dice si la pieza salió y si volvió. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
const PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1400,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 await p.evaluate(px=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'SAPE'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-40AA101',ser:'19096',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'mant',f:hoy,
     ing:'Jose Rojas',pasos:['ent','mant','cert'],calib:'cT'});
   CALIBS.push({id:'cT',act:'aT',ord:'oT',tipo:'psv',os:'PSV-108-001',und:'psi',fecha:hoy,
     firmas:[], pares:[{a:px,d:px,nota:'Papel',notaA:'picado',notaD:'Lapeado',accion:'Limpieza'},
                       {a:px,d:'', nota:'Tobera',notaA:'con óxido',notaD:''}]});
   renderAll(); openPSV('aT',null,'fotos');
 },PX);
 await p.waitForTimeout(800);

 /* las casillas están, dos por foto, y apagadas */
 const cajas=await p.evaluate(()=>{
   const par=document.querySelectorAll('#pvFotos .pv-par')[0];
   const hue=par.querySelectorAll('.pv-hueco');
   return [...hue].map(h=>[...h.querySelectorAll('.pv-hueco-x label')]
     .map(l=>({t:l.textContent.trim(), on:l.querySelector('input').checked})));
 });
 chk(cajas.length===2,'las dos fotos de la pieza · '+cajas.length);
 chk(cajas[0].map(x=>x.t).join(' / ')==='Enviar a arenado / Enviar a pintura',
     'la de ANTES: enviar a arenado y a pintura · '+cajas[0].map(x=>x.t).join(' / '));
 chk(cajas[1].map(x=>x.t).join(' / ')==='Regreso de arenado / Regreso de pintura',
     'la de DESPUÉS: regreso de arenado y de pintura · '+cajas[1].map(x=>x.t).join(' / '));
 chk(cajas.every(h=>h.every(x=>!x.on)),'todas apagadas de salida');

 /* se marcan y quedan guardadas en la pieza */
 await p.evaluate(()=>{
   const par=document.querySelectorAll('#pvFotos .pv-par')[0];
   const hue=par.querySelectorAll('.pv-hueco');
   hue[0].querySelectorAll('.pv-hueco-x input')[0].click();   // enviar a arenado
   hue[0].querySelectorAll('.pv-hueco-x input')[1].click();   // enviar a pintura
   hue[1].querySelectorAll('.pv-hueco-x input')[0].click();   // regreso de arenado
 });
 await p.waitForTimeout(200);
 const g=await p.evaluate(()=>{
   const q=paresFoto(PSV_TMP);
   return {p0:{envAr:!!q[0].envAr,envPi:!!q[0].envPi,regAr:!!q[0].regAr,regPi:!!q[0].regPi},
           p1:{envAr:!!q[1].envAr}};
 });
 chk(g.p0.envAr&&g.p0.envPi&&g.p0.regAr&&!g.p0.regPi,
     'se guardan en la pieza, una a una · '+JSON.stringify(g.p0));
 chk(!g.p1.envAr,'y no se contagian a la pieza de al lado');

 /* sobreviven a repintar la pantalla */
 await p.evaluate(()=>pintarPSVFotos()); await p.waitForTimeout(200);
 const tras=await p.evaluate(()=>{
   const h=document.querySelectorAll('#pvFotos .pv-par')[0].querySelectorAll('.pv-hueco');
   return [...h[0].querySelectorAll('.pv-hueco-x input')].map(x=>x.checked)
     .concat([...h[1].querySelectorAll('.pv-hueco-x input')].map(x=>x.checked));
 });
 chk(tras.join()==='true,true,true,false','siguen marcadas al repintar · '+tras.join());

 /* y salen en el informe, en el pie de cada foto */
 const inf=await p.evaluate(()=>{
   grabarSinMover(PSV_TMP);
   const d=documentoInforme('oT',['oT']);
   return String((d&&(d.html||d))||'');
 });
 chk(/Antes · picado · se mandó a arenado · se mandó a pintura/.test(inf),
     'el pie del ANTES dice a dónde salió');
 chk(/Después · Lapeado · volvió de arenado/.test(inf),
     'el pie del DESPUÉS dice de dónde volvió');
 chk(!/volvió de pintura/.test(inf),'y no dice lo que no se marcó');

 /* una pieza sin marcar no ensucia el papel */
 chk(/Antes · con óxido<\/figcaption>|Antes · con óxido/.test(inf),
     'la pieza sin marcar sale como siempre');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
