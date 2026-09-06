/* Tres casillas y en su orden: recomendaciones, conclusiones y —sólo
   si se enciende— pendientes. Y en el papel, lo que se escribe entra
   en el formato: cada recomendación es un punto más de la lista y la
   conclusión, un párrafo más. Sin rayas de por medio. */
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
   CLIENTES.push({id:'cliT',n:'SAPE'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-108',ser:'C1',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'mant',f:hoy,
     ing:'Jose Rojas',pasos:['ent','mant','cert'],hist:{ent:hoy,mant:hoy},calib:'cT'});
   CALIBS.push({id:'cT',act:'aT',ord:'oT',tipo:'psv',os:'PSV-108-001',und:'psi',set:150,setEsp:150,
     asFound:'152',fecha:hoy,rcFecha:hoy,rcVeredicto:'acepta',rcRecibe:'Jose Rojas',
     respNombre:'Jose Rojas',patSerie:'P',patCert:'C',pares:[{a:px,d:px,nota:'Cuerpo'}],
     firmas:[{rol:'recep',n:'Jose Rojas',f:hoy,h:'08:30',img:px}]});
   renderAll();
 },PX);

 /* ── el cuadro del portal ── */
 await p.evaluate(()=>openPSV('aT'));
 await p.waitForTimeout(700);
 const caja=await p.evaluate(()=>{
   const d=[...document.querySelectorAll('details.psv-sec')]
     .find(x=>/Conclusiones/.test(x.querySelector('summary').textContent));
   if(!d)return null; d.open=true;
   const orden=[...d.querySelectorAll('#pv-oRecom,#pv-oConclu,#pv-oPendOn,#pv-coment')].map(x=>x.id);
   const pend=d.querySelector('#pv-oPendCaja');
   return {orden, oculta:pend?pend.hidden:null, hayViejo:!!d.querySelector('#pv-coment')};
 });
 chk(caja,'el cuadro de conclusiones está');
 chk(caja&&caja.orden.join(',')==='pv-oRecom,pv-oConclu,pv-oPendOn',
     'y sus tres casillas en orden · '+(caja&&caja.orden.join(' → ')));
 chk(caja&&!caja.hayViejo,'ya no hay dos casillas de conclusiones');
 chk(caja&&caja.oculta===true,'los pendientes empiezan apagados y sin casilla');

 /* se enciende el interruptor: aparece la casilla */
 await p.click('#pv-oPendOn');
 await p.waitForTimeout(200);
 chk(await p.evaluate(()=>!$('#pv-oPendCaja').hidden),'al encenderlo, aparece su casilla');
 await p.fill('#pv-oPend','Calibración en línea con equipo profiler');
 await p.waitForTimeout(200);
 chk(await p.evaluate(()=>String(ORDENES.find(x=>x.id==='oT').pend||'').includes('profiler')),
     'y lo que se escribe se guarda en la orden');
 /* se apaga: se apaga de verdad, no queda esperando */
 await p.click('#pv-oPendOn');
 await p.waitForTimeout(300);
 chk(await p.evaluate(()=>!String(ORDENES.find(x=>x.id==='oT').pend||'').trim()),
     'al apagarlo se borra: un apartado apagado no puede reaparecer solo');

 /* ── el papel ── */
 await p.evaluate(()=>{
   const o=ORDENES.find(x=>x.id==='oT');
   o.recom='Cambiar el resorte principal.\nRevisar la brida de descarga.';
   o.conclu='La válvula PSV-108 quedó operativa y se entrega precintada.\nSe entrega con su certificado.';
   o.pend='Calibración en línea con equipo profiler.\nEnviar el acta firmada.';
 });
 const h=await p.evaluate(()=>{const d=documentoInforme('oT',['oT']);
   return String((d&&(d.html||d))||'')});
 const iR=h.indexOf('<h2>Recomendaciones generales</h2>');
 const iC=h.indexOf('<h2>Conclusiones</h2>');
 const iP=h.indexOf('<h2>Pendientes</h2>');
 chk(iR>0&&iC>iR,'en el papel: primero recomendaciones, después conclusiones');
 chk(iP>iC,'y los pendientes al final de todo');

 const secR=h.slice(iR,iC);
 chk(/<li>Cambiar el resorte principal\.<\/li>/.test(secR),
     'cada renglón suyo es un punto más de la lista');
 chk(/<li>Revisar la brida de descarga\.<\/li>/.test(secR),'los dos renglones, los dos puntos');
 chk(!/escrito propio/.test(secR),'y no un párrafo aparte detrás de una raya');
 const ult=secR.lastIndexOf('</ul>');
 chk(secR.indexOf('Cambiar el resorte')<ult,'van DENTRO de la misma lista, no debajo');

 const secC=h.slice(iC,iP>0?iP:iC+3000);
 chk(/quedó operativa/.test(secC),'la conclusión suya sale');
 chk(secC.indexOf('set requerido según placa')<secC.indexOf('quedó operativa'),
     'debajo de la del formato');
 chk(!/escrito propio/.test(secC),'y sin raya que la separe');
 chk(/<li>La válvula PSV-108 quedó operativa y se entrega precintada\.<\/li>/.test(secC),
     'y en puntos, como las recomendaciones');
 chk(/<li>Se entrega con su certificado\.<\/li>/.test(secC),'cada renglón, su punto');
 /* La conclusión de una válvula suelta no vuelve a la última hoja del
    informe: su sitio es el certificado de esa válvula. */
 chk(!/Por válvula/.test(h),'ya no hay un «Por válvula» al final del informe');
 const secP=h.slice(iP,iP+1200);
 chk(/<li>Calibración en línea con equipo profiler\.<\/li>/.test(secP),
     'los pendientes también van en puntos');

 /* la raya de separación ya no existe en la hoja de estilo */
 chk(!/p\.escrito\.propio\{[^}]*border-top/.test(h),'la raya ya no está ni en el estilo');

 /* el certificado usa la conclusión del trabajo si la válvula no tiene la suya */
 const cert=await p.evaluate(()=>{
   const c=CALIBS.find(x=>x.id==='cT');
   return String(conclusionDe(c)||'');
 });
 chk(/quedó operativa/.test(cert),'el certificado toma la conclusión del trabajo · '+cert.slice(0,40));

 const viejo=await p.evaluate(()=>{
   const c=CALIBS.find(x=>x.id==='cT'); c.coment='Chubby y oreo';
   const d=documentoInforme('oT',['oT']); const html=String((d&&(d.html||d))||'');
   return {enInforme:/Chubby y oreo/.test(html), enCert:conclusionDe(c)==='Chubby y oreo'};
 });
 chk(!viejo.enInforme,'un apunte viejo de una válvula no se cuela en el informe');
 chk(viejo.enCert,'pero no se pierde: sigue en el certificado de esa válvula');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
