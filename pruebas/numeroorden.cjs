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

 /* El nombre del cliente: la PERSONA a la que se le entrega el
    trabajo, no la razón social. Es la que sale en «Atención». */
 const pers=await p.evaluate(()=>{
   const e=document.querySelector('#ocCliPers');
   if(!e)return null;
   e.value='Marta Salas'; e.dispatchEvent(new Event('input'));
   const g=document.querySelector('#ocCliCargo');
   g.value='Jefa de mantenimiento'; g.dispatchEvent(new Event('input'));
   return {vacia:!e.defaultValue, contacto:contactoCliente(cli('cliT')),
           cargo:cargoDelContacto(cli('cliT')),
           empresa:(CLIENTES.find(c=>c.id==='cliT')||{}).n};
 });
 chk(pers&&pers.vacia,'la casilla empieza vacía: no hay contacto apuntado todavía');
 chk(pers&&pers.contacto==='Marta Salas','se escribe la persona · '+(pers&&pers.contacto));
 chk(pers&&pers.cargo==='Jefa de mantenimiento','y su cargo · '+(pers&&pers.cargo));
 chk(pers&&pers.empresa==='SAPE','y la razón social NO se toca · '+(pers&&pers.empresa));

 /* Y es la que sale en el informe, bajo «Atención» */
 const enPapel=await p.evaluate(()=>{
   const hoy=HOY.toISOString().slice(0,10);
   ORDENES.push({id:'oI',act:'aT',mat:'PSV-200',n:'PSV-200',num:200,et:'mant',f:hoy,
     ing:'Jose Rojas',pasos:['mant'],hist:{mant:hoy},calib:'cI'});
   CALIBS.push({id:'cI',act:'aT',ord:'oI',tipo:'psv',os:'PSV-200',und:'psi',
     setEsp:150,fecha:hoy,respNombre:'Jose Rojas'});
   const d=documentoInforme('oI',['oI']); const h=String((d&&(d.html||d))||'');
   const m=h.match(/<span>Atención<\/span><i>:<\/i><b>([\s\S]{0,60}?)<\/b>/);
   return m?m[1]:'';
 });
 chk(/Marta Salas/.test(enPapel),'y sale en el informe, en Atención · '+enPapel);

 /* Al volver a abrir la ventana, la persona ya está puesta */
 await p.evaluate(()=>{closeModal(); mandarAMantenimiento('aT')});
 await p.waitForTimeout(500);
 chk(await p.evaluate(()=>(document.querySelector('#ocCliPers')||{}).value)==='Marta Salas',
     'y la próxima vez ya viene puesta');

 /* Al cliente no se le abre esa ventana */
 const alCliente=await p.evaluate(()=>{
   closeModal(); abrirSesion(CUENTAS.find(x=>x.perfil==='cliente'),false);
   document.querySelector('#mBody').innerHTML='';
   try{mandarAMantenimiento('aT')}catch(e){}
   return document.querySelector('#mBody').innerHTML.length;
 });
 chk(alCliente===0,'al cliente ni se le abre esa ventana');

 /* Y en «Nueva OC», sin ninguna válvula marcada, las casillas salen */
 await p.evaluate(()=>{closeModal(); abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false)});
 await p.waitForTimeout(600);
 await p.evaluate(()=>openProyecto());
 await p.waitForTimeout(600);
 const enOC=await p.evaluate(()=>{
   const sel=document.querySelector('#pyCli');
   if(sel){ sel.value='cliT'; pintarPryValvulas() }
   return {cifras:!!document.querySelector('#ocNumCifras'),
           pers:(document.querySelector('#ocCliPers')||{}).value};
 });
 chk(enOC.cifras,'en «Nueva OC» está la casilla del número');
 chk(enOC.pers==='Marta Salas',
     'y la de la persona, aunque no haya ninguna válvula marcada · '+enOC.pers);

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
