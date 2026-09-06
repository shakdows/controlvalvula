/* En mantenimiento se pide el mantenimiento, no el ensayo entero. */
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

 /* Una válvula en mantenimiento, con prueba de salida por delante.
    El desarme está hecho; falta la firma y las conclusiones. */
 await p.evaluate(px=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'SAPE'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-40AA101',ser:'C156933',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'mant',f:hoy,
     ing:'Jose Rojas',pasos:['ent','mant','cert'],hist:{ent:hoy,mant:hoy},calib:'cT'});
   CALIBS.push({id:'cT',act:'aT',ord:'oT',tipo:'psv',os:'PSV-108-001',und:'psi',
     set:150,setEsp:150,asFound:'152',fecha:hoy,rcFecha:hoy,rcVeredicto:'acepta',
     rcRecibe:'Jose Rojas', patSerie:'P-1',patCert:'C-1',
     pares:[{a:px,d:px,nota:'Cuerpo'}],
     firmas:[{rol:'recep',n:'Jose Rojas',f:hoy,h:'08:30',img:px}]});
   renderAll(); openPSV('aT',null,'fotos');
 },PX);
 await p.waitForTimeout(700);

 const pie=()=>p.evaluate(()=>{
   const bs=[...document.querySelectorAll('#mFoot button')].map(x=>({
     t:x.textContent.trim(), tit:x.getAttribute('title')||''}));
   return {botones:bs, ppal:bs[bs.length-1]};
 });

 let v=await pie();
 chk(/¿Qué falta\?/.test(v.ppal.t),'con el taller a medias, el botón pregunta · '+v.ppal.t);
 chk(!/disparo/i.test(v.ppal.tit),'y NO pide los disparos de la prueba de salida · «'+v.ppal.tit+'»');
 chk(/conclusiones|nombre|firma/i.test(v.ppal.tit),'sino lo del taller · «'+v.ppal.tit+'»');

 /* lo que señala al pulsar: sólo casillas del taller */
 await p.evaluate(()=>avisarFaltaPSV()); await p.waitForTimeout(300);
 const aviso=await p.evaluate(()=>({
   txt:document.querySelector('#mFoot .pie-confirma').textContent.replace(/\s+/g,' ').trim(),
   naranjas:[...document.querySelectorAll('#mBody .falta')].map(e=>e.id)}));
 chk(/terminar el mantenimiento/.test(aviso.txt),'el aviso habla del mantenimiento · '+aviso.txt.slice(0,60));
 chk(!/disparo/i.test(aviso.txt),'y no menciona los disparos');
 chk(!aviso.naranjas.some(id=>/^dsp/.test(id)),
     'no se pinta en naranja ninguna casilla de la salida · '+aviso.naranjas.join(', '));

 /* se completa el taller: conclusiones + firma */
 await p.evaluate(px=>{
   PSV_TMP.coment='Se cambió el resorte y se ajustó el perno.';
   PSV_TMP.respNombre='Jose Rojas'; PSV_TMP.respArea='Técnico';
   PSV_TMP.firmas.push({rol:'ejec',n:'Jose Rojas',cargo:'Técnico',
     f:HOY.toISOString().slice(0,10),h:'11:40',img:px});
   pintarPSV();
 },PX);
 await p.waitForTimeout(400);
 v=await pie();
 chk(/Pasar a prueba de salida/.test(v.ppal.t),
     'con el taller entero, el botón lleva a la salida · '+v.ppal.t);
 chk(await p.evaluate(()=>tallerListo(PSV_TMP)),'y el taller consta como terminado');
 chk(await p.evaluate(()=>psvFaltantes(PSV_TMP).length>0),
     'aunque al ensayo entero le sigan faltando los disparos · así tiene que ser');

 /* y el botón hace lo que dice */
 await p.evaluate(()=>salidaDesdeElEnsayo()); await p.waitForTimeout(600);
 const tras=await p.evaluate(()=>({
   titulo:document.querySelector('#mTitle').textContent,
   abierta:document.querySelector('#modal').classList.contains('on'),
   guardado:!!(CALIBS.find(x=>x.id==='cT')||{}).coment}));
 chk(/Prueba de salida/i.test(tras.titulo),'abre la prueba de salida · '+tras.titulo);
 chk(tras.guardado,'y lo escrito quedó guardado antes de salir');

 /* una válvula SIN prueba de salida sigue emitiendo su certificado */
 const sinSalida=await p.evaluate(()=>{
   closeModal();
   const o=ORDENES.find(x=>x.id==='oT'); o.pasos=['ent','mant']; o.et='mant';
   PSV_TMP=null; openPSV('aT',null,'fotos');
   const bs=[...document.querySelectorAll('#mFoot button')].map(x=>x.textContent.trim());
   return bs[bs.length-1];
 });
 chk(/Emitir certificado|¿Qué falta\?/.test(sinSalida),
     'sin prueba de salida, el mantenimiento sigue cerrando el certificado · '+sinSalida);

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
