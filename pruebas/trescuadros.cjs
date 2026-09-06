/* En mantenimiento: 1 Desarme · 2 Conclusiones · 3 Firmas, a la vista. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
const PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1400,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='tec'),false));
 await p.waitForTimeout(600);
 await p.evaluate(px=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'SAPE'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-40AA101',ser:'C156933',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'mant',f:hoy,
     ing:'Jose Rojas',pasos:['ent','mant','cert'],hist:{ent:hoy,mant:hoy},calib:'cT'});
   CALIBS.push({id:'cT',act:'aT',ord:'oT',tipo:'psv',os:'PSV-108-001',und:'psi',
     set:150,setEsp:150,asFound:'152',fecha:hoy,rcFecha:hoy,rcVeredicto:'acepta',
     rcRecibe:'Jose Rojas',patSerie:'P-1',patCert:'C-1',
     pares:[{a:px,d:px,nota:'Cuerpo'}],
     firmas:[{rol:'recep',n:'Jose Rojas',f:hoy,h:'08:30',img:px}]});
   renderAll(); openPSV('aT',null,'fotos');
 },PX);
 await p.waitForTimeout(700);

 const cuadros=()=>p.evaluate(()=>[...document.querySelectorAll('#mBody details.psv-sec')]
   .filter(d=>!d.classList.contains('oculto'))
   .map(d=>{const s=d.querySelector('summary');
     return (s.querySelector('.pn')||{}).textContent+' · '+
       s.textContent.replace(/\s+/g,' ').replace(/^\d+\s*·\s*/,'').split('completo')[0]
        .split('faltan')[0].trim()}));

 let v=await cuadros();
 chk(v.length===3,'se ven tres cuadros y no dos · '+v.length);
 chk(/^1 · Desarme/.test(v[0]||''),'1 · Desarme · '+v[0]);
 chk(/^2 · Conclusiones/.test(v[1]||''),'2 · Conclusiones · '+v[1]);
 chk(/^3 · Firmas/.test(v[2]||''),'3 · Firmas · '+v[2]);

 /* las conclusiones se ven ANTES de preguntar qué falta */
 const antes=await p.evaluate(()=>{
   const d=[...document.querySelectorAll('#mBody details.psv-sec')]
     .find(x=>/Conclusiones/.test(x.querySelector('summary').textContent));
   return {oculto:d.classList.contains('oculto'),
           campo:!!document.querySelector('#pv-oConclu')};
 });
 chk(!antes.oculto&&antes.campo,'la casilla de conclusiones está a la vista sin preguntar nada');

 /* el aviso de lo que no se ve habla por su nombre, no por número */
 const nota=await p.evaluate(()=>{
   const d=document.querySelector('#psvVerTodo');
   return d?d.textContent.replace(/\s+/g,' ').trim():'';
 });
 chk(/prueba de entrada/i.test(nota),'el aviso nombra lo que ya está hecho · '+nota.slice(0,80));
 chk(/prueba de disparo/i.test(nota),'y lo que viene después');
 chk(!/paso 5|los 4 y 5|el 5/.test(nota),'sin números que en esta pantalla no existen');

 /* al pulsar ¿Qué falta? no aparece ningún número raro */
 await p.evaluate(()=>avisarFaltaPSV()); await p.waitForTimeout(300);
 const tras=await cuadros();
 chk(tras.join(' | ')===v.join(' | '),'tras preguntar, los cuadros siguen siendo los mismos · '+tras.join(' | '));
 const nums=tras.map(x=>x.split(' ·')[0]);
 chk(nums.join()==='1,2,3','y numerados 1, 2, 3 · '+nums.join());

 /* al completarlos, el pie deja pasar a la salida */
 await p.evaluate(px=>{
   PSV_TMP.coment='Se cambió el resorte.';
   PSV_TMP.respNombre='Jose Rojas'; PSV_TMP.respArea='Técnico';
   PSV_TMP.firmas.push({rol:'ejec',n:'Jose Rojas',cargo:'Técnico',
     f:HOY.toISOString().slice(0,10),h:'11:40',img:px});
   pintarPSV();
 },PX);
 await p.waitForTimeout(400);
 const pie=await p.evaluate(()=>{
   const bs=[...document.querySelectorAll('#mFoot button')];
   return bs[bs.length-1].textContent.trim();
 });
 chk(/Pasar a prueba de salida/.test(pie),'con los tres llenos, el pie deja pasar · '+pie);
 const marcas=await p.evaluate(()=>[...document.querySelectorAll('#mBody details.psv-sec')]
   .filter(d=>!d.classList.contains('oculto'))
   .map(d=>/completo/.test(d.querySelector('summary').textContent)));
 chk(marcas.every(Boolean),'y los tres dicen «completo» · '+marcas.join(', '));

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
