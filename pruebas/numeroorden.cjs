/* El número de orden se escribe, con el PSV- puesto por la casa, y el
   portal dice cuál toca. Y debajo, el nombre del cliente se corrige
   desde ahí mismo. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1200,height:950}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 await p.evaluate(()=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'SAPE'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-40AA101',ser:'C1',cl:'seguridad',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oV',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'final',f:hoy,pasos:['mant']});
   renderAll();
 });

 /* La casilla, tal como se abre */
 await p.evaluate(()=>mandarAMantenimiento('aT'));
 await p.waitForTimeout(600);
 const inicio=await p.evaluate(()=>({
   fijo:(document.querySelector('.os-fijo')||{}).textContent,
   cifras:(document.querySelector('#ocNumCifras')||{}).value,
   sug:(document.querySelector('#ocNumSug')||{}).textContent.trim(),
   aviso:(document.querySelector('#ocNumAviso')||{}).textContent.trim(),
   oculto:(document.querySelector('#ocNum')||{}).value}));
 chk(inicio.fijo==='PSV-','el PSV- lo pone la casa y no se teclea · '+inicio.fijo);
 chk(inicio.cifras==='109','y viene puesto el que toca · '+inicio.cifras);
 chk(/Es el que toca/.test(inicio.sug),'y lo dice · '+inicio.sug);
 chk(!inicio.aviso,'sin avisos cuando no hay nada que avisar');
 chk(inicio.oculto==='PSV-109','y el número que se guardaría es el entero · '+inicio.oculto);

 /* Se escribe otro: se guarda ése */
 const aMano=await p.evaluate(()=>{
   const e=document.querySelector('#ocNumCifras');
   e.value='250'; e.dispatchEvent(new Event('input'));
   return {oculto:document.querySelector('#ocNum').value,
           aviso:document.querySelector('#ocNumAviso').textContent.trim(),
           sug:document.querySelector('#ocNumSug').textContent.trim(),
           leido:leerNumOS(['aT'])};
 });
 chk(aMano.oculto==='PSV-250','se escribe el que se quiera · '+aMano.oculto);
 chk(aMano.leido.cod==='PSV-250'&&aMano.leido.num===250,
     'y es el que se guarda · '+aMano.leido.cod);
 chk(/Salta 141/.test(aMano.aviso),'avisa de cuántos se saltan · '+aMano.aviso);
 chk(/Usar el 109/.test(aMano.sug),'y ofrece el que toca · '+aMano.sug);

 /* El botón devuelve al que toca */
 await p.click('#ocNumSug button');
 await p.waitForTimeout(150);
 const vuelto=await p.evaluate(()=>({
   cifras:document.querySelector('#ocNumCifras').value,
   sug:document.querySelector('#ocNumSug').textContent.trim()}));
 chk(vuelto.cifras==='109'&&/Es el que toca/.test(vuelto.sug),
     'y con un toque se vuelve al que toca · '+vuelto.cifras);

 /* Lo que no se puede colar */
 const guardas=await p.evaluate(()=>{
   const e=document.querySelector('#ocNumCifras'), av=document.querySelector('#ocNumAviso');
   const prueba=v=>{e.value=v;e.dispatchEvent(new Event('input'));
     return {queda:e.value, dice:av.textContent.trim()}};
   return {letras:prueba('12a3b'), repetido:prueba('108'),
           bajo:prueba('50'), oc:prueba('450006785')};
 });
 chk(guardas.letras.queda==='123','sólo cifras: las letras no entran · '+guardas.letras.queda);
 chk(/ya está usado/.test(guardas.repetido.dice),
     'avisa si el número ya es de otra orden · '+guardas.repetido.dice);
 chk(/empiezan en 100/.test(guardas.bajo.dice),'y si es más bajo de lo que usa la casa');
 chk(/orden de compra/.test(guardas.oc.dice),
     'y si le meten la orden de compra del cliente · '+guardas.oc.dice);
 /* Y sobre todo: ese número NO llega a guardarse. Un 450006785 tomado
    por correlativo hace que la casa numere desde cuatrocientos
    cincuenta millones — de eso ya se salió una vez. */
 const noEnvenena=await p.evaluate(()=>{
   const e=document.querySelector('#ocNumCifras');
   e.value='450006785'; e.dispatchEvent(new Event('input'));
   const l=leerNumOS(['aT']);
   e.value='50'; e.dispatchEvent(new Event('input'));
   const b=leerNumOS(['aT']);
   return {alto:l, bajo:b};
 });
 chk(noEnvenena.alto.num===109,
     'y la orden de compra NO se guarda como correlativo · quedó '+noEnvenena.alto.cod);
 chk(noEnvenena.bajo.num===109,
     'ni un número por debajo de los de la casa · quedó '+noEnvenena.bajo.cod);

 /* El nombre del cliente, desde ahí mismo · pero bajo llave */
 const cerrado=await p.evaluate(()=>{
   const e=document.querySelector('#ocCliNom');
   if(!e)return null;
   return {trae:e.value, bloqueado:e.readOnly,
           hayBoton:!!document.querySelector('.cli-lock-btn')};
 });
 chk(cerrado&&cerrado.trae==='SAPE','la casilla trae el nombre que tiene · '+(cerrado&&cerrado.trae));
 chk(cerrado&&cerrado.bloqueado,'el nombre viene cerrado con candado');
 chk(cerrado&&cerrado.hayBoton,'y con su botón de desbloquear');

 /* Con la clave mal, no se abre */
 await p.click('.cli-lock-btn');
 await p.waitForTimeout(150);
 const malaClave=await p.evaluate(()=>{
   const i=document.querySelector('#cliClave'); i.value='0000';
   cliProbarClave();
   return {sigueCerrado:document.querySelector('#ocCliNom').readOnly};
 });
 chk(malaClave.sigueCerrado,'con la clave equivocada sigue cerrado');

 /* Con la clave buena, se abre y se cambia */
 const nombre=await p.evaluate(()=>{
   const i=document.querySelector('#cliClave'); i.value='1234';
   cliProbarClave();
   const e=document.querySelector('#ocCliNom');
   const abierto=!e.readOnly;
   e.value='SAPE INDUSTRIAL S.A.C.'; e.dispatchEvent(new Event('input'));
   return {abierto, ahora:(CLIENTES.find(c=>c.id==='cliT')||{}).n};
 });
 chk(nombre&&nombre.abierto,'con la clave 1234 se abre');
 chk(nombre&&nombre.ahora==='SAPE INDUSTRIAL S.A.C.',
     'y al cambiarlo cambia la empresa · '+(nombre&&nombre.ahora));
 /* Vacío no: dejaría papeles sin cliente */
 const vacio=await p.evaluate(()=>{
   const e=document.querySelector('#ocCliNom');
   e.value='   '; e.dispatchEvent(new Event('input'));
   return (CLIENTES.find(c=>c.id==='cliT')||{}).n;
 });
 chk(vacio==='SAPE INDUSTRIAL S.A.C.','vacío no se acepta: un papel sin cliente no vale · '+vacio);

 /* Al técnico se le enseña, cerrado: si tiene la clave del jefe, la
    corrige; si no, al menos ve con qué nombre va a salir el papel. */
 await p.evaluate(()=>{closeModal(); abrirSesion(CUENTAS.find(x=>x.perfil==='tec'),false)});
 await p.waitForTimeout(600);
 await p.evaluate(()=>mandarAMantenimiento('aT'));
 await p.waitForTimeout(500);
 const tec=await p.evaluate(()=>{const e=document.querySelector('#ocCliNom');
   return {hay:!!e, cerrado:e&&e.readOnly}});
 chk(tec.hay&&tec.cerrado,'al técnico se le enseña, pero cerrado');

 /* Al cliente, ni eso: ni siquiera le abre la ventana. */
 const alCliente=await p.evaluate(()=>{
   closeModal(); abrirSesion(CUENTAS.find(x=>x.perfil==='cliente'),false);
   document.querySelector('#mBody').innerHTML='';
   try{mandarAMantenimiento('aT')}catch(e){}
   return {campo:!!document.querySelector('#ocCliNom'),
           html:document.querySelector('#mBody').innerHTML.length};
 });
 chk(!alCliente.campo&&alCliente.html===0,
     'y al cliente ni se le abre esa ventana');

 /* Y en «Nueva OC», donde todavía no hay ninguna válvula marcada, la
    casilla sale igual: el cliente lo dice el desplegable de arriba. */
 await p.evaluate(()=>{closeModal(); abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false)});
 await p.waitForTimeout(600);
 await p.evaluate(()=>openProyecto());
 await p.waitForTimeout(600);
 const enOC=await p.evaluate(()=>{
   const sel=document.querySelector('#pyCli');
   if(sel){ sel.value='cliT'; pintarPryValvulas() }
   const e=document.querySelector('#ocCliNom');
   return {hay:!!e, trae:e&&e.value, cifras:!!document.querySelector('#ocNumCifras')};
 });
 chk(enOC.cifras,'en «Nueva OC» está la casilla del número');
 chk(enOC.hay,'y la del nombre del cliente, aunque no haya ninguna válvula marcada');
 chk(enOC.trae==='SAPE INDUSTRIAL S.A.C.','con el nombre de la empresa elegida · '+enOC.trae);

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
