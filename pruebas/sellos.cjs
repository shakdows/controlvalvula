/* Cuándo salió y cuándo volvió cada pieza · sólo para gerencia. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
const PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1500,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 await p.evaluate(px=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'SAPE'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-40AA101',ser:'19096',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',oc:'OC-771',mat:'PSV-108',n:'PSV-108',num:108,et:'mant',
     f:hoy,ing:'Jose Rojas',pasos:['ent','mant','cert'],calib:'cT'});
   CALIBS.push({id:'cT',act:'aT',ord:'oT',tipo:'psv',os:'PSV-108-001',und:'psi',fecha:hoy,
     firmas:[], pares:[{a:px,d:px,nota:'Cuerpo',notaA:'con óxido',notaD:'arenado'}]});
   renderAll(); openPSV('aT',null,'fotos');
 },PX);
 await p.waitForTimeout(800);

 /* al marcar, queda sellado */
 const sel=await p.evaluate(()=>{
   const h=document.querySelectorAll('#pvFotos .pv-par')[0].querySelectorAll('.pv-hueco');
   h[0].querySelectorAll('.pv-hueco-x input')[0].click();   // enviar a arenado
   const q=paresFoto(PSV_TMP)[0];
   return {marca:!!q.envAr, ts:q.envArTs||'', forma:/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(q.envArTs||'')};
 });
 chk(sel.marca&&sel.ts,'marcar sella la fecha y la hora · '+sel.ts);
 chk(sel.forma,'con la forma de siempre · AAAA-MM-DD HH:MM');

 /* y desmarcar borra el sello: no queda fecha de algo que no pasó */
 const des=await p.evaluate(()=>{
   const h=document.querySelectorAll('#pvFotos .pv-par')[0].querySelectorAll('.pv-hueco');
   h[0].querySelectorAll('.pv-hueco-x input')[0].click();
   const q=paresFoto(PSV_TMP)[0];
   return {marca:!!q.envAr, ts:q.envArTs};
 });
 chk(!des.marca&&!des.ts,'al desmarcar se borra el sello');

 /* el jefe ve el sello en el formulario */
 await p.evaluate(()=>{
   const q=paresFoto(PSV_TMP)[0];
   q.envAr=true; q.envArTs='2026-09-02 08:15';
   q.regAr=true; q.regArTs='2026-09-05 16:40';
   pintarPSVFotos();
 });
 await p.waitForTimeout(250);
 const jefe=await p.evaluate(()=>[...document.querySelectorAll('#pvFotos .pv-hueco-ts')]
   .map(x=>x.textContent.replace(/\s+/g,' ').trim()));
 chk(jefe.length===2,'gerencia ve los dos sellos · '+jefe.length);
 chk(/Arenado · salida · 02\/09\/2026 · 08:15/.test(jefe[0]||''),'el de salida · '+jefe[0]);
 chk(/Arenado · retorno · 05\/09\/2026 · 16:40/.test(jefe[1]||''),'el de retorno · '+jefe[1]);

 /* el técnico NO los ve */
 const tec=await p.evaluate(()=>{
   applyRole('tec'); openPSV('aT',null,'fotos');
   const n=document.querySelectorAll('#pvFotos .pv-hueco-ts').length;
   const cajas=document.querySelectorAll('#pvFotos .pv-hueco-x input').length;
   applyRole('admin');
   return {n,cajas};
 });
 chk(tec.n===0,'el técnico no ve las fechas · '+tec.n);
 chk(tec.cajas===4,'pero sigue teniendo sus casillas para marcar · '+tec.cajas);

 /* el cuadro de gerencia · con las marcas ya guardadas en el ensayo */
 await p.evaluate(()=>{
   closeModal(); PSV_TMP=null;
   const q=CALIBS.find(x=>x.id==='cT').pares[0];
   q.envAr=true; q.envArTs='2026-09-02 08:15';
   q.regAr=true; q.regArTs='2026-09-05 16:40';
   renderAll(); go('horas');
 });
 await p.waitForTimeout(500);
 const cuadro=await p.evaluate(()=>{
   const c=document.querySelector('#hoFueraCaja');
   const fs=[...document.querySelectorAll('#hoFuera tbody tr')]
     .map(tr=>[...tr.children].map(td=>td.textContent.replace(/\s+/g,' ').trim()));
   return {visible:c&&c.style.display!=='none', filas:fs};
 });
 chk(cuadro.visible,'sale el cuadro «Piezas fuera de casa»');
 chk(cuadro.filas.length===1,'con su fila · '+cuadro.filas.length);
 const f=cuadro.filas[0]||[];
 chk(/SAPE/.test(f[0]||'')&&/Cuerpo/.test(f[3]||'')&&/Arenado/.test(f[4]||''),
     'empresa, pieza y trabajo · '+f.slice(0,5).join(' | '));
 chk(/02\/09\/2026 · 08:15/.test(f[5]||''),'la salida con su hora · '+f[5]);
 chk(/05\/09\/2026 · 16:40/.test(f[6]||''),'el retorno con su hora · '+f[6]);
 chk(/3 días/.test(f[7]||''),'y cuánto estuvo fuera · '+f[7]);

 /* ni el cliente en su informe: dice QUÉ pasó, no CUÁNDO */
 const inf=await p.evaluate(()=>{
   const d=documentoInforme('oT',['oT']);
   return String((d&&(d.html||d))||'');
 });
 chk(/se mandó a arenado/.test(inf)&&/volvió de arenado/.test(inf),
     'el informe sigue diciendo QUÉ pasó');
 chk(!/08:15/.test(inf)&&!/16:40/.test(inf),'pero no CUÁNDO · eso no va al cliente');

 /* una pieza que salió y no ha vuelto */
 const abierta=await p.evaluate(()=>{
   const q=CALIBS.find(x=>x.id==='cT').pares[0];
   delete q.regAr; delete q.regArTs;
   renderHoras();
   const tr=document.querySelectorAll('#hoFuera tbody tr')[0];
   return [...tr.children].map(td=>td.textContent.replace(/\s+/g,' ').trim());
 });
 chk(/sin volver/.test(abierta[6]||''),'lo que no ha vuelto se dice · '+abierta[6]);

 /* sólo gerencia entra a esa pantalla */
 const quien=await p.evaluate(()=>{
   const a=document.querySelector('#nav a[data-p="horas"]'); const r={};
   ['admin','tec','com','cliente'].forEach(x=>{applyRole(x);r[x]=a.style.display!=='none'});
   applyRole('admin'); return r;
 });
 chk(quien.admin&&!quien.tec&&!quien.com&&!quien.cliente,
     'la pestaña sigue siendo sólo de gerencia');

 /* y se exporta */
 const exp=await p.evaluate(()=>{
   const X=window.XLSX; window.XLSX=undefined;
   let filas=null; const bc=window.bajarCSV;
   window.bajarCSV=(n,f)=>{filas=f};
   go('horas'); renderHoras(); horasExcel();
   window.bajarCSV=bc; window.XLSX=X;
   const txt=(filas||[]).map(r=>r.join('|')).join('\n');
   return {hay:/PIEZAS FUERA DE CASA/.test(txt), sal:/2026-09-02 08:15/.test(txt)};
 });
 chk(exp.hay,'el Excel trae su hoja de piezas fuera de casa');
 chk(exp.sal,'con la fecha y la hora en crudo, para cruzarla');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
