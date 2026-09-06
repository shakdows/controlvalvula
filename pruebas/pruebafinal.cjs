/* La prueba de salida, las cuatro cosas que se corrigieron:
     1 · guardar no pierde el trabajo (un Preventivo o un Correctivo
         se ata a su orden igual que una Calibración)
     2 · si la orden se reasigna, manda el ingeniero nuevo
     3 · en esa columna sólo se ven los disparos y la firma
     4 · la tolerancia se elige en el ensayo: 3 % o 1 % */
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

 /* Una válvula en prueba de salida, con orden PREVENTIVA —que es
    justo la que se perdía— y su mantenimiento ya hecho y firmado. */
 const sembrar=async()=>p.evaluate(px=>{
   ['cliT'].forEach(()=>{});
   CLIENTES.length=0; ACTIVOS.length=0; ORDENES.length=0; CALIBS.length=0;
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'SAPE'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-40AA101',ser:'C156933',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'cert',f:hoy,
     tipo:'Preventivo',ing:'Christian Soto',pasos:['ent','mant','cert'],
     hist:{ent:hoy,mant:hoy,cert:hoy}});
   CALIBS.push({id:'cT',act:'aT',ord:'oT',tipo:'psv',os:'PSV-108-001',und:'psi',
     set:150,setEsp:150,asFound:'152',fecha:hoy,veredicto:'incompleto',
     rcFecha:hoy,rcVeredicto:'acepta',rcRecibe:'Jose Rojas',
     respNombre:'Christian Soto',respArea:'Técnico',
     patSerie:'P-1',patCert:'C-1',coment:'Mantenimiento hecho.',
     pares:[{a:px,d:px,nota:'Cuerpo'}],
     firmas:[{rol:'recep',n:'Jose Rojas',f:hoy,h:'08:30',img:px},
             {rol:'ejec', n:'Christian Soto',f:hoy,h:'12:00',img:px}]});
   renderAll();
 },PX);
 await sembrar();

 /* ── 1 · guardar en prueba de salida no pierde el trabajo ── */
 await p.evaluate(()=>openPSV('aT'));
 await p.waitForTimeout(600);
 const guardado=await p.evaluate(()=>{
   /* los tres disparos del as-left, con su foto */
   const px='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
   const l=disparosDe(PSV_TMP);
   [150,151,149].forEach((v,i)=>{l[i].v=String(v);l[i].pc='150';l[i].fotos=[px]});
   const id=guardarPSV(false);
   const o=ORDENES.find(x=>x.id==='oT');
   return {id, atada:o&&o.calib, cuantos:CALIBS.length};
 });
 chk(guardado.atada===guardado.id,
     'el ensayo queda atado a su orden aunque sea Preventivo · '+guardado.atada);
 chk(guardado.cuantos===1,'y no se fabrica un ensayo nuevo · '+guardado.cuantos+' en total');

 /* y al reabrir sigue estando TODO, no un formulario en blanco */
 await p.evaluate(()=>openPSV('aT'));
 await p.waitForTimeout(500);
 const reabierto=await p.evaluate(()=>({
   id:PSV_TMP.id, os:PSV_TMP.os, asFound:PSV_TMP.asFound,
   piezas:(PSV_TMP.pares||[]).length,
   disparos:disparosDe(PSV_TMP).filter(x=>num(x.v)>0).length,
   cuantos:CALIBS.length}));
 chk(reabierto.id===guardado.id,'al reabrir es el MISMO papel · '+reabierto.id);
 chk(reabierto.os==='PSV-108-001','con su orden de servicio');
 chk(reabierto.asFound==='152','con el disparo de entrada');
 chk(reabierto.piezas===1,'con las fotos del desarme');
 chk(reabierto.disparos===3,'y con los tres disparos de salida');
 chk(reabierto.cuantos===1,'y sigue habiendo un solo ensayo');

 /* ── 3 · en la prueba de salida, disparos y firma. Nada más ── */
 const cuadros=await p.evaluate(()=>
   [...document.querySelectorAll('#mBody details.psv-sec')]
     .filter(d=>!d.classList.contains('oculto'))
     .map(d=>d.querySelector('summary').textContent.replace(/\s+/g,' ').trim()));
 chk(cuadros.length===2,'se ven dos cuadros · '+cuadros.length+' · '+cuadros.join(' | '));
 chk(cuadros.some(x=>/disparo/i.test(x)),'la prueba de disparo');
 chk(cuadros.some(x=>/Firmas/i.test(x)),'y las firmas');
 chk(!cuadros.some(x=>/entrada/i.test(x)),'la prueba de entrada no sale');
 chk(!cuadros.some(x=>/Desarme/i.test(x)),'ni el desarme');

 /* aunque falte algo de atrás, no le abre el cuadro al jefe */
 const conHueco=await p.evaluate(()=>{
   CALIBS[0].asFound=''; CALIBS[0].pares=[];
   openPSV('aT'); return true;
 });
 await p.waitForTimeout(500);
 const cuadros2=await p.evaluate(()=>
   [...document.querySelectorAll('#mBody details.psv-sec')]
     .filter(d=>!d.classList.contains('oculto'))
     .map(d=>d.querySelector('summary').textContent.replace(/\s+/g,' ').trim()));
 chk(conHueco&&cuadros2.length===2,
     'con huecos del taller, siguen siendo dos · '+cuadros2.join(' | '));
 /* pero se le dice, no se le esconde */
 await p.evaluate(()=>avisarFaltaPSV());
 await p.waitForTimeout(200);
 const pie=await p.evaluate(()=>$('#mFoot').textContent.replace(/\s+/g,' ').trim());
 chk(/del taller queda/i.test(pie),'y se le dice lo que quedó del taller · '+pie.slice(0,90));

 /* ── 2 · si la orden se reasigna, manda el ingeniero nuevo ── */
 await sembrar();
 const cambio=await p.evaluate(()=>{
   ORDENES.find(x=>x.id==='oT').ing='Jose Rojas';   // se reasigna
   openPSV('aT');
   return {nombre:PSV_TMP.respNombre,
           firmas:(PSV_TMP.firmas||[]).map(f=>f.rol+':'+f.n)};
 });
 await p.waitForTimeout(300);
 chk(cambio.nombre==='Jose Rojas','al reasignar, el encargado es el nuevo · '+cambio.nombre);
 chk(!cambio.firmas.some(x=>/^ejec/.test(x)),
     'y la firma del anterior se retira: una firma es de una persona · '+cambio.firmas.join(' | '));
 chk(cambio.firmas.some(x=>/^recep:Jose Rojas/.test(x)),
     'la de recepción no se toca: es de otro');

 /* y si NO se cambia, la firma se queda donde está */
 await sembrar();
 const igual=await p.evaluate(()=>{
   openPSV('aT');
   return {nombre:PSV_TMP.respNombre,
           firmo:(PSV_TMP.firmas||[]).some(f=>f.rol==='ejec'&&f.img)};
 });
 chk(igual.nombre==='Christian Soto'&&igual.firmo,
     'sin reasignar, el que firmó sigue firmado · '+igual.nombre);

 /* ── 4 · la tolerancia, 3 % o 1 %, en el propio ensayo ── */
 await p.waitForTimeout(400);
 const tol0=await p.evaluate(()=>({
   dela:tolDelEnsayo(PSV_TMP), casa:CRITERIOS.pct,
   botones:[...document.querySelectorAll('#mBody .tol-b')].map(b=>b.textContent.trim()),
   marcado:[...document.querySelectorAll('#mBody .tol-b.on')].map(b=>b.textContent.trim())}));
 chk(tol0.dela===3,'de entrada, la de la casa · ± '+tol0.dela+' %');
 chk(tol0.botones.slice(0,2).join(' / ')==='3 % / 1 %','hay dos botones · '+tol0.botones.slice(0,2).join(' / '));
 chk(tol0.marcado[0]==='3 %','y el de la casa viene marcado · '+tol0.marcado[0]);

 const tol1=await p.evaluate(()=>{
   psvTolerancia(1);
   /* La banda que se dibuja y contra la que se juzga cada disparo. */
   const t=tolPSV(num(PSV_TMP.setEsp),PSV_TMP.und||'psi',tolDelEnsayo(PSV_TMP));
   const casa=tolPSV(num(PSV_TMP.setEsp),PSV_TMP.und||'psi');
   return {dela:tolDelEnsayo(PSV_TMP), casa:CRITERIOS.pct,
           txt:t&&t.txt, txtCasa:casa&&casa.txt,
           marcado:[...document.querySelectorAll('#mBody .tol-b.on')].map(b=>b.textContent.trim())};
 });
 chk(tol1.dela===1,'se elige el 1 % · ± '+tol1.dela+' %');
 chk(tol1.casa===3,'y la de la casa NO se toca · sigue en ± '+tol1.casa+' %');
 chk(/1/.test(String(tol1.txt))&&!/3/.test(String(tol1.txt)),
     'la banda del ensayo es la elegida · '+tol1.txt);
 chk(/3/.test(String(tol1.txtCasa)),'y la de la casa sigue siendo la suya · '+tol1.txtCasa);
 chk(tol1.marcado[0]==='1 %','y el botón queda marcado en el elegido · '+tol1.marcado[0]);

 /* y con el 1 % un disparo que pasaba deja de pasar */
 const juicio=await p.evaluate(()=>{
   const px='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
   const l=disparosDe(PSV_TMP);
   [153,153,153].forEach((v,i)=>{l[i].v=String(v);l[i].pc='150';l[i].fotos=[px]});
   PSV_TMP.tolPct=3; const a=psvVeredicto(PSV_TMP).estado;
   PSV_TMP.tolPct=1; const b=psvVeredicto(PSV_TMP).estado;
   return {a,b};
 });
 chk(juicio.a==='aprobado','153 sobre 150 pasa al 3 % · '+juicio.a);
 chk(juicio.b==='rechazado','y no pasa al 1 % · '+juicio.b);

 /* y la elegida viaja con el ensayo, no se queda en la pantalla */
 const viaja=await p.evaluate(()=>{
   PSV_TMP.tolPct=1; guardarPSV(false,true);
   return (CALIBS.find(x=>x.id===PSV_TMP.id)||{}).tolPct;
 });
 chk(viaja===1,'y se guarda con el ensayo · '+viaja);

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
