/* Una foto del cuadro de conclusiones, para mirarlo. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1000,height:1100}});
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 await p.evaluate(px=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'SAPE'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-108',ser:'C1',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'mant',f:hoy,
     ing:'Jose Rojas',pasos:['ent','mant','cert'],hist:{ent:hoy,mant:hoy},calib:'cT',
     recom:'Cambiar el resorte principal.\nRevisar la brida de descarga.',
     conclu:'La válvula PSV-108 quedó operativa y se entrega precintada.'});
   CALIBS.push({id:'cT',act:'aT',ord:'oT',tipo:'psv',os:'PSV-108-001',und:'psi',set:150,setEsp:150,
     asFound:'152',fecha:hoy,rcFecha:hoy,rcVeredicto:'acepta',rcRecibe:'Jose Rojas',
     respNombre:'Jose Rojas',patSerie:'P',patCert:'C',pares:[{a:px,d:px,nota:'Cuerpo'}],
     firmas:[{rol:'recep',n:'Jose Rojas',f:hoy,h:'08:30',img:px}]});
   renderAll(); openPSV('aT');
 },PX);
 await p.waitForTimeout(800);
 const caja=await p.evaluateHandle(()=>{
   const d=[...document.querySelectorAll('details.psv-sec')]
     .find(x=>/Conclusiones/.test(x.querySelector('summary').textContent));
   d.open=true; d.scrollIntoView(); return d;
 });
 await p.waitForTimeout(400);
 await caja.asElement().screenshot({path:'/tmp/cuadro.png'});
 console.log('listo · /tmp/cuadro.png');
 await b.close();
})();
