/* Lo fijo del formato no se mueve; lo que escribe gerencia se añade
   debajo, en su propio renglón.
   Lo fijo, en el DVAD-SER-002 de verdad, es: la lista de
   recomendaciones (apartado 11) y la frase de conclusión con las
   cuentas del trabajo (apartado 12). Lista de conclusiones no hay:
   el formato no la tiene y por eso el portal ya no la inventa. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
const PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
const limpio=h=>String(h).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const tramo=(h,a,b)=>{const i=h.indexOf(a); if(i<0)return '';
  const j=h.indexOf(b,i+a.length); return limpio(h.slice(i, j<0?i+3000:j))};

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
     patSerie:'P',patCert:'C',pares:[{a:px,d:px,nota:'Cuerpo'}],
     firmas:[{rol:'recep',n:'Jose Rojas',f:hoy,h:'08:30',img:px}]});
   renderAll();
 },PX);

 const informe=()=>p.evaluate(()=>{const d=documentoInforme('oT',['oT']);
   return String((d&&(d.html||d))||'')});
 const fijasR=await p.evaluate(()=>INFORME_RECOM.slice());
 const hayLista=await p.evaluate(()=>typeof INFORME_CONCLU!=='undefined');

 /* 0 · el formato no tiene lista de conclusiones, y el portal tampoco */
 chk(!hayLista,'no se inventa una lista de conclusiones que el formato no tiene');

 /* 1 · sin escribir nada, lo fijo ya está */
 let h=await informe();
 chk(fijasR.length>=5,'el formato tiene sus recomendaciones fijas · '+fijasR.length);
 chk(fijasR.every(x=>h.includes(x)),'salen todas sin escribir nada');
 chk(/Se realizó el mantenimiento y la calibración de/.test(limpio(h)),
     'y la conclusión del formato, con las cuentas del trabajo');

 /* 2 · se escriben las suyas: lo fijo NO se va */
 await p.evaluate(()=>{
   const o=ORDENES.find(x=>x.id==='oT');
   o.conclu='La válvula PSV-108 quedó operativa y se entrega precintada.';
   o.recom ='Programar la próxima parada para setiembre.';
 });
 h=await informe();
 chk(fijasR.every(x=>h.includes(x)),'al escribir las suyas, las fijas SIGUEN ahí');
 chk(/Se realizó el mantenimiento y la calibración de/.test(limpio(h)),
     'y la conclusión del formato también');
 chk(h.includes('quedó operativa y se entrega precintada'),'y lo suyo aparece');
 chk(h.includes('Programar la próxima parada'),'su recomendación también');

 /* 3 · y va DEBAJO de lo fijo, no encima */
 const secC=tramo(h,'<h2>Conclusiones</h2>','<h2>');
 chk(secC.indexOf('quedó operativa')>secC.indexOf('con el set requerido según placa'),
     'lo suyo va debajo de la conclusión del formato');
 const secR=tramo(h,'<h2>Recomendaciones generales</h2>','<h2>');
 chk(secR.indexOf('Programar la próxima')>secR.indexOf(fijasR[fijasR.length-1].slice(0,30)),
     'y en recomendaciones, igual');
 chk(/<li>Programar la próxima parada para setiembre\.<\/li>/.test(h),
     'y la suya es un punto más de la misma lista');

 /* 4 · en su propio renglón, no pegado a lo fijo */
 const marcado=await p.evaluate(()=>{
   const d=documentoInforme('oT',['oT']); const html=String((d&&(d.html||d))||'');
   const i=html.indexOf('<h2>Conclusiones</h2>');
   const t=html.slice(i,html.indexOf('<h3',i)+1||undefined);
   return {punto:/<ul class="escrito">[\s\S]*?<li>[^<]*quedó operativa/.test(t),
           sinRaya:!/escrito propio/.test(t)};
 });
 chk(marcado.punto,'y lo suyo en su punto, como las recomendaciones');
 chk(marcado.sinRaya,'sin una raya que lo separe: entra en el papel, no encima');

 /* 5 · lo fijo no se puede borrar desde el portal */
 const borrable=await p.evaluate(()=>{
   const o=ORDENES.find(x=>x.id==='oT'); o.conclu=''; o.recom='';
   const d=documentoInforme('oT',['oT']); const html=String((d&&(d.html||d))||'');
   return INFORME_RECOM.every(x=>html.includes(x))&&/set requerido según placa/.test(html);
 });
 chk(borrable,'borrando lo suyo, lo del formato sigue entero');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
