/* Saca el informe a PDF para mirarlo al lado del papel de la casa. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
const FOTO='https://placehold.co/600x450/8a8f96/ffffff.png?text=foto';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1400,height:1000}});
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 /* Una foto de verdad, en data:, para que el papel se vea como se ve. */
 const gris=await p.evaluate(()=>{
   const c=document.createElement('canvas'); c.width=600; c.height=450;
   const x=c.getContext('2d'); x.fillStyle='#9aa0a6'; x.fillRect(0,0,600,450);
   x.fillStyle='#fff'; x.font='bold 34px sans-serif'; x.textAlign='center';
   x.fillText('FOTO',300,240); return c.toDataURL('image/png');
 });
 await p.evaluate(px=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'KIMBERLY CLARK PERÚ',dir:'Puente Piedra'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-108',ser:'C1',medida:'4" x 6"',
     setPress:150,setUnd:'psi',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'mant',f:hoy,oc:'450006785',
     ing:'Jose Rojas',pasos:['ent','mant','cert'],hist:{ent:hoy,mant:hoy},calib:'cT',
     recom:'Cambiar el resorte principal.\nRevisar la brida de descarga.',
     conclu:'La válvula PSV-108 quedó operativa y se entrega precintada.\nSe entrega con su certificado individual.',
     pend:'Calibración en línea con equipo profiler.\nEnviar el acta firmada al cliente.'});
   CALIBS.push({id:'cT',act:'aT',ord:'oT',tipo:'psv',os:'PSV-108-001',und:'psi',set:150,setEsp:150,
     asFound:'152',fecha:hoy,rcFecha:hoy,rcVeredicto:'acepta',rcRecibe:'Jose Rojas',
     respNombre:'Jose Rojas',respArea:'Técnico de válvulas',
     patDesc:'Banco de pruebas',patMarca:'BARBEE',patModelo:'TP-RVAS',patSerie:'P-1',patCert:'C-1',
     pares:[{a:px,d:px,nota:'Válvula de seguridad KRIMA 4"x6"',accion:'Inspección inicial, contaminación por óxido'},
            {a:px,d:px,nota:'Tobera',accion:'Se realizó recuperación por lapeo'},
            {a:px,d:px,nota:'Disco',accion:'Se realizó recuperación por lapeo',
             envAr:true,envArTs:hoy+' 08:00',regAr:true,regArTs:hoy+' 15:00'}],
     tests:[{v:150,pc:'2',fotos:[px]}],
     firmas:[{rol:'recep',n:'Jose Rojas',f:hoy,h:'08:30',img:px}]});
   renderAll();
 },gris);
 const html=await p.evaluate(()=>{const d=documentoInforme('oT',['oT']);
   return String((d&&(d.html||d))||'')});
 const q=await b.newPage();
 await q.setContent(html,{waitUntil:'networkidle'});
 await q.pdf({path:'/tmp/informe.pdf',format:'A4',printBackground:true});
 console.log('listo · /tmp/informe.pdf');
 await b.close();
})();
