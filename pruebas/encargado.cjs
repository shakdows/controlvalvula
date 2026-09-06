/* El encargado del mantenimiento es el que tomó la orden, y es el
   que sale puesto para firmar. */
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

 /* La orden la tomó Jose Rojas, pero el papel venía con otro nombre
    pegado de antes: es el caso de la foto. */
 await p.evaluate(()=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'SAPE'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-40AA101',ser:'19096',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'mant',f:hoy,
     tipo:'Preventivo', ing:'Jose Rojas', tomada:hoy, tomadaH:'13:59',
     pasos:['ent','mant','cert'], calib:'cT'});
   CALIBS.push({id:'cT',act:'aT',ord:'oT',tipo:'psv',os:'PSV-108-001',und:'psi',
     fecha:hoy, respNombre:'Wilson Chapoñán', respArea:'Técnico', firmas:[]});
   renderAll(); openPSV('aT');
 });
 await p.waitForTimeout(700);

 const v=await p.evaluate(()=>{
   const el=document.querySelector('#pv-resp');
   return {puesto:(PSV_TMP||{}).respNombre, texto:el&&el.textContent.trim(),
           ing:(ORDENES.find(x=>x.id==='oT')||{}).ing};
 });
 chk(v.puesto==='Jose Rojas','manda el que tomó la orden · '+v.puesto);
 chk(/Jose Rojas/.test(v.texto||''),'y es el que se ve en el formulario · '+v.texto);
 chk(!/Wilson/.test(v.texto||''),'el nombre viejo ya no aparece');

 /* y es el que sale puesto en la ventana de firmar */
 const firma=await p.evaluate(()=>{
   const g=window.guardarPSV; window.guardarPSV=()=>'cT';   // no cerrar el ensayo
   firmarEnsayo();
   window.guardarPSV=g;
   const n=document.querySelector('#fmNom');
   return {nom:n&&n.value, cargo:(document.querySelector('#fmCargo')||{}).value,
           titulo:document.querySelector('#mTitle').textContent};
 });
 chk(firma.nom==='Jose Rojas','al firmar sale su nombre puesto · '+firma.nom);
 chk(firma.cargo==='Técnico','y su cargo · '+firma.cargo);

 /* Un ensayo firmado por el MISMO que tiene la orden no se toca. */
 const mismo=await p.evaluate(px=>{
   closeModal();
   const c=CALIBS.find(x=>x.id==='cT');
   const o=ORDENES.find(x=>x.id==='oT');
   c.respNombre=o.ing;
   c.firmas=[{rol:'ejec',n:o.ing,cargo:'Técnico',
              f:HOY.toISOString().slice(0,10),h:'11:40',img:px}];
   PSV_TMP=null; openPSV('aT');
   return {nom:(PSV_TMP||{}).respNombre,
           firmo:((PSV_TMP||{}).firmas||[]).some(f=>f.rol==='ejec'&&f.img)};
 },PX);
 chk(mismo.nom==='Jose Rojas'&&mismo.firmo,
     'firmado por el que tiene la orden: no se toca nada · '+mismo.nom);

 /* Pero si la orden se REASIGNA, la firma del anterior no puede seguir
    en el papel haciendo de la del nuevo: se retira y firma él. */
 const otro=await p.evaluate(px=>{
   closeModal();
   const c=CALIBS.find(x=>x.id==='cT');
   c.respNombre='Christian Soto';
   c.firmas=[{rol:'ejec',n:'Christian Soto',cargo:'Técnico',
              f:HOY.toISOString().slice(0,10),h:'11:40',img:px}];
   PSV_TMP=null; openPSV('aT');            // la orden es de Jose Rojas
   return {nom:(PSV_TMP||{}).respNombre,
           firmo:((PSV_TMP||{}).firmas||[]).some(f=>f.rol==='ejec'&&f.img)};
 },PX);
 chk(otro.nom==='Jose Rojas','reasignada, el encargado es el nuevo · '+otro.nom);
 chk(!otro.firmo,'y la firma del anterior se retira: una firma es de una persona');

 /* si nadie la ha tomado, se puede elegir */
 const libre=await p.evaluate(()=>{
   closeModal();
   const o=ORDENES.find(x=>x.id==='oT'); delete o.ing;
   const c=CALIBS.find(x=>x.id==='cT'); c.firmas=[]; delete c.respNombre;
   PSV_TMP=null; openPSV('aT');
   const el=document.querySelector('#pv-resp');
   return {tag:el&&el.tagName, lista:!!(el&&el.closest('.tec-pick')),
           puesto:(PSV_TMP||{}).respNombre||''};
 });
 chk(libre.tag==='INPUT'&&libre.lista,
     'sin nadie asignado se puede elegir de la lista · '+libre.tag);
 chk(!libre.puesto,'y no se inventa ningún nombre · «'+libre.puesto+'»');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
