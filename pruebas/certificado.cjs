/* El certificado, como el AXAD-SER-003 de la casa, y a un toque desde
   la tarjeta: sin entrar a «Revisar y firmar». */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
const PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
const limpio=h=>String(h).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1400,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 await p.evaluate(px=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'Kimberly Clark',areas:{a1:'KRIMA'},
     firmantes:[{rol:'vbResp',n:'Luis Zafra',cargo:'Gestor de contrato'}]});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'31-TSV-0007',ser:'NO',ar:'a1',ubic:'KRIMA',
     mod:'1.0819',medida:'4" x 6"',norma:'ASME VIII',fluido:'VAPOR',
     setPress:3.5,setUnd:'bar',cl:'seguridad'});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-412',n:'PSV-412',num:412,et:'final',f:hoy,
     oc:'4504763849',aten:'Luis Zafra',ing:'Jose Manrique',
     pasos:['ent','mant','cert'],hist:{ent:hoy,mant:hoy,cert:hoy,final:hoy},calib:'cT'});
   CALIBS.push({id:'cT',act:'aT',ord:'oT',tipo:'psv',os:'PSV-412-001',und:'bar',
     setEsp:3.5,fecha:hoy,fluidoP:'NITRÓGENO',
     patDesc:'MANOVACUOMETRO DIGITAL',patMarca:'ADDITEL',patModelo:'681',
     patSerie:'211H17A80002',patEscala:'0.1 psi',patExact:'0,2 % FS',
     patFecha:hoy,patCert:'MT-09245-2026',
     respNombre:'Jose Manrique',respArea:'Asesor Técnico',
     tests:[{v:'3.57',pc:'3.50'},{v:'3.53',pc:'3.50'},{v:'3.56',pc:'3.50'}],
     firmas:[{rol:'ejec',n:'Jose Manrique',cargo:'Asesor Técnico',f:hoy,h:'10:00',img:px},
             {rol:'vbAdo',n:'Jose Rojas',cargo:'Supervisor Técnico',f:hoy,h:'11:00',img:px}]});
   renderAll();
 },PX);

 const h=await p.evaluate(()=>{const d=psvDocumento('cT');return d?d.html:''});
 const txt=limpio(h);

 /* El membrete: el código y la versión del formato de la casa */
 chk(/AXAD-SER-003/.test(h),'el código del formato · AXAD-SER-003');
 chk(/02 \(15\/01\/2025\)/.test(h),'y su versión, la del formato · 02 (15/01/2025)');
 chk(!/AXAD-088/.test(h),'ya no lleva el código que no era');
 chk(/CERTIFICADO DE VERIFICACIÓN, CALIBRACIÓN/.test(h),'con el título del formato');
 chk(/Página <b>1<\/b> de 1/.test(h),'y «Página 1 de 1» en su casilla');

 /* La cabecera: empresa, contacto, certificado y contrato */
 chk(/Empresa<b>Kimberly Clark<\/b>/.test(h),'la empresa');
 chk(/Contacto<b>Luis Zafra<\/b>/.test(h),'su contacto, el mismo del informe');
 chk(/Certificado n\.º<b>PSV-412-001<\/b>/.test(h),'el número del certificado');
 chk(/Contrato<b>4504763849<\/b>/.test(h),'y el contrato: la orden de compra del cliente');

 /* El procedimiento, una sola vez */
 chk(/PROCEDIMIENTO DE VERIFICACIÓN Y CALIBRACIÓN/.test(h),'el procedimiento está');
 chk((h.match(/Ajuste de la presión de disparo/g)||[]).length===1,
     'y una sola vez: antes salía dos · '+(h.match(/Ajuste de la presión de disparo/g)||[]).length);
 chk(/<ol class="proc">/.test(h),'numerado, como en el formato');

 /* Los comentarios de la casa */
 chk(/COMENTARIOS U OBSERVACIONES/.test(h),'el apartado de comentarios');
 chk(/norma ASME, acorde a los estándares API 527 y 576/.test(txt),
     'con la norma con la que se ensayó');
 chk(/ASME Sección VIII/.test(txt),'y las dos reglas de tolerancia');

 /* ── El botón de la tarjeta ── */
 await p.evaluate(()=>{go('wo'); renderWO()});
 await p.waitForTimeout(700);
 const boton=await p.evaluate(()=>{
   const b=[...document.querySelectorAll('#kanban button')]
     .find(x=>/Certificado técnico/.test(x.textContent));
   return b?{hay:true, txt:b.textContent.replace(/\s+/g,' ').trim()}:{hay:false};
 });
 chk(boton.hay,'la tarjeta tiene su botón de certificado · '+(boton.txt||''));

 /* Y saca el papel sin pasar por «Revisar y firmar» */
 const saca=await p.evaluate(()=>{
   let abierto=null;
   const orig=window.abrirDoc; window.abrirDoc=(html,t)=>{abierto={t,n:String(html).length}};
   certificadoDeOrden('oT');
   window.abrirDoc=orig;
   return abierto;
 });
 chk(saca&&/Certificado/.test(saca.t||''),'y al pulsarlo sale el certificado · '+(saca&&saca.t));
 chk(saca&&saca.n>2000,'con el papel entero dentro');

 /* Con dos válvulas pregunta cuál, que cada una tiene el suyo */
 const dos=await p.evaluate(px=>{
   const hoy=HOY.toISOString().slice(0,10);
   ACTIVOS.push({id:'aT2',cli:'cliT',tag:'31-TSV-0008',ser:'N2',cl:'seguridad',setPress:3.5,setUnd:'bar'});
   ORDENES.push({id:'oT2',act:'aT2',mat:'PSV-412',n:'PSV-412',num:412,grupo:'gX',et:'final',
     f:hoy,oc:'4504763849',pasos:['cert'],calib:'cT2'});
   ORDENES.find(x=>x.id==='oT').grupo='gX';
   CALIBS.push({id:'cT2',act:'aT2',ord:'oT2',tipo:'psv',os:'PSV-412-002',und:'bar',
     setEsp:3.5,fecha:hoy,tests:[{v:'3.5',pc:'3.5'}]});
   let abierto=null;
   const orig=window.abrirDoc; window.abrirDoc=()=>{abierto=true};
   certificadoDeOrden('oT');
   window.abrirDoc=orig;
   return {abrio:abierto, ventana:document.querySelector('#mTitle').textContent,
           cuantos:document.querySelectorAll('#mBody .py-it').length};
 },PX);
 chk(!dos.abrio,'con dos válvulas no saca uno al azar');
 chk(/Certificado técnico/.test(dos.ventana),'pregunta cuál · '+dos.ventana);
 chk(dos.cuantos===2,'y ofrece las dos · '+dos.cuantos);

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
