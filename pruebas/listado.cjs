/* El listado de válvulas de la casa: una línea por válvula, con su
   ensayo entero. Se prueba con el archivo de verdad. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
const HOJAS=JSON.parse(fs.readFileSync(process.argv[2]||'/tmp/nuevo.json','utf8'));

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1400,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(700);
 await p.evaluate(()=>{
   CLIENTES.push({id:'cliT',n:'ORYGEN',areas:{a1:'Planta'}});
   S.inCli='cliT'; renderAll(); go('import');
 });
 await p.waitForTimeout(400);

 const filas=HOJAS[Object.keys(HOJAS)[0]];

 /* 1 · lo reconoce por sus rótulos, no contando celdas */
 const rec=await p.evaluate(f=>({fila:filaListadoPSV(f), nombres:nombresListado(f,filaListadoPSV(f))}),filas);
 chk(rec.fila===1,'encuentra la fila de cabecera · fila '+(rec.fila+1)+' del Excel');
 chk(rec.nombres.primera===3,'y sabe que los datos empiezan en la 4 · '+(rec.nombres.primera+1));
 chk(rec.nombres.nombres[21]==='TEST SALIDA · TEST 1',
     'junta las dos filas de cabecera · '+rec.nombres.nombres[21]);
 chk(rec.nombres.nombres[38]==='disco · Ø Int','y arrastra el rótulo combinado · '+rec.nombres.nombres[38]);

 /* 2 · lee las ocho válvulas y todas sus columnas */
 const prev=await p.evaluate(f=>{
   detectar(f,'Hoja1');
   if(!LST_PREVIEW)return {error:'no lo tomó por listado'};
   const it=LST_PREVIEW.items;
   const sinCol=Object.keys(LISTADO_COLS).filter(k=>LST_PREVIEW.idx[k]===undefined);
   return {n:it.length, sinCol, primera:it[0], ultima:it[it.length-1],
           conFalta:it.filter(x=>x.falta.length).length};
 },filas);
 chk(!prev.error,'lo toma por el listado de la casa'+(prev.error?' · '+prev.error:''));
 chk(prev.n===8,'lee las ocho válvulas · '+prev.n);
 chk(prev.sinCol.length===0,'y reconoce TODAS las columnas · faltan: '+(prev.sinCol.join(', ')||'ninguna'));
 chk(prev.conFalta===0,'ninguna línea sale incompleta · '+prev.conFalta);

 const a=prev.primera||{};
 chk(a.osLinea==='PSV-403-001','la primera es la PSV-403-001 · '+a.osLinea);
 chk(a.oc==='JA10138289','con su orden de compra · '+a.oc);
 chk(a.contacto==='FARID ROJAS','y su contacto · '+a.contacto);
 chk(a.tag==='34MBN21AA192','el TAG · '+a.tag);
 chk(a.ser==='SE26406','la serie · '+a.ser);
 chk(a.marca==='CONSOLIDATED'&&a.mod==='1912-EC-2-DL','marca y modelo · '+a.marca+' '+a.mod);
 chk(a.setPress==='1315'&&a.setUnd==='PSI','el set con su unidad · '+a.setPress+' '+a.setUnd);
 chk(a.medida==='1" X 2"','la medida, con sus pulgadas enteras · '+a.medida);
 chk(a.clase==='#600 X #150','la clase · '+a.clase);
 chk(a.ubic==='DESCARGA SWING','la ubicación · '+a.ubic);
 chk(a.cert==='UV','la certificación · '+a.cert);
 chk(a.orif==='E','el orificio · '+a.orif);
 chk(a.fecha==='2026-03-19','la fecha de mantenimiento · '+a.fecha);
 chk(a.asFound==='1315','el disparo de entrada · '+a.asFound);
 chk(a.tests.length===3,'los tres disparos de salida · '+a.tests.length);
 chk(a.tests.map(t=>t.v).join(' ')==='1315.6 1312.4 1314.9','con sus valores · '+a.tests.map(t=>t.v).join(' '));
 /* Los guiones del Excel no son datos */
 chk(a.pernoIni===''&&a.coment==='','un guion no es un valor: queda vacío');

 /* 3 · se consolida y entra todo */
 const res=await p.evaluate(()=>{
   const antesA=ACTIVOS.length, antesO=ORDENES.length, antesC=CALIBS.length;
   consolidarListadoPSV();
   const nuevas=ACTIVOS.filter(x=>x.cli==='cliT');
   const v=nuevas.find(x=>x.ser==='SE26406');
   const c=CALIBS.find(x=>x.act===v.id);
   const o=ORDENES.find(x=>x.act===v.id);
   return {
     activos:ACTIVOS.length-antesA, ordenes:ORDENES.length-antesO, calibs:CALIBS.length-antesC,
     val:{tag:v.tag,ser:v.ser,marca:v.marca,mod:v.mod,medida:v.medida,clase:v.clase,
          setPress:v.setPress,setUnd:v.setUnd,cert:v.cert,orif:v.orif,fluido:v.fluido,
          ubic:v.ubic,capac:v.capac,norma:v.norma,ult:v.ult,prox:v.prox,cl:v.cl},
     ens:{os:c.os,fecha:c.fecha,asFound:c.asFound,setEsp:c.setEsp,und:c.und,
          disparos:disparosDe(c).filter(t=>t.v).map(t=>t.v),
          veredicto:c.veredicto, medidas:!!c.medidas},
     ord:{mat:o.mat,num:o.num,oc:o.oc,aten:o.aten,et:o.et,arch:!!o.arch,calib:o.calib===c.id},
     grupos:new Set(ORDENES.filter(x=>x.deListado).map(x=>x.grupo)).size,
     contacto:contactoCliente(cli('cliT'))
   };
 });
 chk(res.activos===8,'entran las 8 válvulas · '+res.activos);
 chk(res.calibs===8,'con sus 8 ensayos · '+res.calibs);
 chk(res.ordenes===8,'y sus 8 órdenes · '+res.ordenes);
 chk(res.grupos===1,'todas bajo la misma orden de compra · '+res.grupos+' grupo');

 chk(res.val.tag==='34MBN21AA192'&&res.val.ser==='SE26406','la válvula, con su nombre');
 chk(res.val.marca==='CONSOLIDATED'&&res.val.mod==='1912-EC-2-DL','su marca y modelo de verdad, no uno del catálogo');
 chk(res.val.medida==='1" X 2"'&&res.val.clase==='#600 X #150','medida y clase');
 chk(res.val.setPress==='1315'&&res.val.setUnd==='PSI','set y unidad');
 chk(res.val.cert==='UV'&&res.val.orif==='E'&&res.val.norma==='ASME','certificación, orificio y norma');
 chk(res.val.fluido==='COMBUSTIBLE LIQUIDO'&&res.val.ubic==='DESCARGA SWING','fluido y ubicación');
 chk(res.val.cl==='seguridad','y entra como válvula de seguridad');
 chk(res.val.ult==='2026-03-19','con la fecha de su último servicio · '+res.val.ult);

 chk(res.ens.os==='PSV-403-001','el ensayo lleva el número de la casa · '+res.ens.os);
 chk(res.ens.asFound==='1315','su disparo de entrada · '+res.ens.asFound);
 chk(res.ens.disparos.join(' ')==='1315.6 1312.4 1314.9','y los tres de salida · '+res.ens.disparos.join(' '));
 chk(res.ens.veredicto&&res.ens.veredicto!=='incompleto','con su veredicto ya calculado · '+res.ens.veredicto);
 chk(res.ens.medidas,'y las medidas del desarme guardadas');

 chk(res.ord.mat==='PSV-403'&&res.ord.num===403,'la orden es la PSV-403 · '+res.ord.mat);
 chk(res.ord.oc==='JA10138289','con la orden de compra del cliente en SU casilla · '+res.ord.oc);
 chk(res.ord.aten==='FARID ROJAS','y el contacto sellado en la orden · '+res.ord.aten);
 chk(res.ord.et==='final'&&res.ord.arch,'cerrada y al historial: no ensucia el tablero');
 chk(res.ord.calib,'y atada a su ensayo');
 chk(res.contacto==='FARID ROJAS','el contacto queda puesto en la empresa · '+res.contacto);

 /* 4 · y sale su certificado, con los datos del archivo */
 const cert=await p.evaluate(()=>{
   const v=ACTIVOS.find(x=>x.ser==='SE26406');
   const c=CALIBS.find(x=>x.act===v.id);
   const d=psvDocumento(c.id); const h=d?d.html:'';
   return {hay:!!h, os:/PSV-403-001/.test(h), oc:/JA10138289/.test(h),
           tag:/34MBN21AA192/.test(h), contacto:/FARID ROJAS/.test(h),
           disparo:/1,315\.60|1315\.6/.test(h)};
 });
 chk(cert.hay,'de cada válvula sale su certificado');
 chk(cert.os,'con su número · PSV-403-001');
 chk(cert.oc,'el contrato del cliente');
 chk(cert.tag&&cert.contacto,'el TAG y el contacto');
 chk(cert.disparo,'y sus disparos');

 /* 5 · subirlo dos veces no duplica la válvula */
 const otra=await p.evaluate(f=>{
   const antes=ACTIVOS.filter(x=>x.cli==='cliT').length;
   detectar(f,'Hoja1'); consolidarListadoPSV();
   return {antes, ahora:ACTIVOS.filter(x=>x.cli==='cliT').length};
 },filas);
 chk(otra.ahora===otra.antes,
     'subirlo otra vez NO duplica las válvulas · '+otra.antes+' → '+otra.ahora);

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
