/* La versión ligera de una foto no puede pisar lo que se escribió
   mientras esa foto estaba subiendo. */
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

 /* El caso de planta, paso a paso:
      1. se saca la foto del ANTES y el ensayo se pone en la cola;
      2. la subida tarda —son megas y hay poca señal—;
      3. mientras tanto se saca la foto del DESPUÉS y se marca que la
         pieza volvió de arenado;
      4. termina la subida y se guarda la versión ligera. */
 const r=await p.evaluate(px=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'SAPE'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-1',ser:'1',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'mant',
                 f:hoy,ing:'Jose Rojas',calib:'cT'});
   const c={id:'cT',act:'aT',ord:'oT',tipo:'psv',fecha:hoy,firmas:[],
            pares:[{a:px,d:'',nota:'Cuerpo'}]};
   CALIBS.push(c);

   /* 1 · la fotocopia que se encola (IndexedDB clona, no referencia) */
   const encolada={coleccion:'CALIBS', clave:'cT', k:'CALIBS·cT',
                   datos:JSON.parse(JSON.stringify(c))};

   /* 3 · el técnico sigue trabajando mientras aquello sube */
   c.pares[0].d=px;
   c.pares[0].regAr=true; c.pares[0].regArTs='2026-09-06 15:10';

   /* 4 · llega la versión ligera de la fotocopia vieja */
   const ligera=JSON.parse(JSON.stringify(encolada.datos));
   ligera.pares[0].a='data:image/jpeg;base64,LIGERA';
   guardarAligerada(encolada,ligera,encolada.datos);

   const q=CALIBS.find(x=>x.id==='cT').pares[0];
   return {antes:!!q.a, despues:!!q.d, marca:!!q.regAr, sello:q.regArTs||''};
 },PX);
 chk(r.despues,'la foto del DESPUÉS sigue ahí · lo de la cola no la pisa');
 chk(r.marca&&r.sello==='2026-09-06 15:10','y la marca del retorno con su sello');
 chk(r.antes,'la del ANTES tampoco se pierde');

 /* y si nadie tocó nada, sí se guarda la ligera: el ahorro sigue */
 const ahorro=await p.evaluate(px=>{
   const c={id:'cQ',act:'aT',ord:'oT',tipo:'psv',fecha:HOY.toISOString().slice(0,10),
            firmas:[],pares:[{a:px,d:'',nota:'Tobera'}]};
   CALIBS.push(c);
   const encolada={coleccion:'CALIBS',clave:'cQ',k:'CALIBS·cQ',
                   datos:JSON.parse(JSON.stringify(c))};
   const ligera=JSON.parse(JSON.stringify(c));
   ligera.pares[0].a='data:image/jpeg;base64,LIGERA';
   guardarAligerada(encolada,ligera,encolada.datos);
   return CALIBS.find(x=>x.id==='cQ').pares[0].a;
 },PX);
 chk(/LIGERA/.test(ahorro),'sin cambios de por medio, la ligera sí entra · el ahorro se mantiene');

 /* y lo que está abierto en el formulario no se toca jamás */
 const abierto=await p.evaluate(px=>{
   openPSV('aT',null,'fotos');
   const c=CALIBS.find(x=>x.id==='cT');
   const encolada={coleccion:'CALIBS',clave:'cT',k:'CALIBS·cT',
                   datos:JSON.parse(JSON.stringify(c))};
   const ligera=JSON.parse(JSON.stringify(c));
   ligera.pares[0].a='data:image/jpeg;base64,PISADA';
   guardarAligerada(encolada,ligera,encolada.datos);
   closeModal();
   return CALIBS.find(x=>x.id==='cT').pares[0].a;
 },PX);
 chk(!/PISADA/.test(abierto),'lo que está abierto en pantalla no se toca ni aunque cuadre');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
