/* De mantenimiento no se sale a medias, y el encargado no se vuelve a elegir. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
const PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1500,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 await p.evaluate(px=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'Kimberly-Clark Peru S.R.L.'});
   ACTIVOS.push({id:'aM',cli:'cliT',tag:'PSV-107',ser:'19096',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oM',act:'aM',mat:'PSV-107',n:'PSV-107',num:107,et:'mant',f:hoy,
                 ing:'Wilson Chapoñán',tomada:hoy,tomadaH:'08:00',pasos:['ent','mant','cert']});
   CALIBS.push({id:'cM',act:'aM',ord:'oM',tipo:'psv',os:'PSV-107-001',und:'psi',
                set:150,setEsp:150,asFound:'152',fecha:hoy,rcFecha:hoy,rcVeredicto:'acepta',
                rcRecibe:'Wilson Chapoñán',
                pares:[{a:px,d:px,n:'Resorte'}],
                firmas:[{rol:'recep',n:'Wilson Chapoñán',f:hoy,h:'08:30',img:px}]});
   renderAll(); go('wo');
 },PX);
 await p.waitForTimeout(500);

 const mira=()=>p.evaluate(()=>{
   const art=[...document.querySelectorAll('#kanban .wo')].find(x=>/PSV-107/.test(x.textContent));
   if(!art)return null;
   const bs=[...art.querySelectorAll('button')].map(x=>({t:x.textContent.trim(),off:x.disabled}));
   const av=bs.find(x=>/Pasar a prueba de salida/.test(x.t));
   return {av, nota:(art.querySelector('.wo-parte')||{}).textContent||'',
           falta:faltaDelTaller(CALIBS.find(c=>c.id==='cM')).map(x=>x.que)};
 });

 let e=await mira();
 chk(e&&e.av&&e.av.off,'sin terminar el taller, el botón no se puede pulsar');
 chk(e&&/Falta las conclusiones/.test(e.nota),'y dice qué falta · '+(e||{}).nota);
 chk(e&&e.falta.length===3,'faltan conclusiones, nombre y firma · '+(e||{}).falta.join(' / '));

 /* se escriben las conclusiones: sigue faltando la firma */
 await p.evaluate(()=>{const c=CALIBS.find(x=>x.id==='cM');
   c.coment='Se cambió el resorte y se ajustó el perno.'; renderAll()});
 await p.waitForTimeout(300);
 e=await mira();
 chk(e&&e.av.off,'con las conclusiones puestas, sigue sin poder pulsarse');
 chk(e&&/nombre de quien hizo el trabajo|firma del ejecutante/.test(e.nota),'ahora falta la firma · '+e.nota);

 /* se firma: ahora sí */
 await p.evaluate(px=>{const c=CALIBS.find(x=>x.id==='cM');
   c.respNombre='Wilson Chapoñán'; c.respArea='Técnico';
   c.firmas.push({rol:'ejec',n:'Wilson Chapoñán',cargo:'Técnico',
                  f:HOY.toISOString().slice(0,10),h:'11:40',img:px});
   renderAll()},PX);
 await p.waitForTimeout(300);
 e=await mira();
 chk(e&&e.av&&!e.av.off,'con el taller entero, el botón tira');
 chk(e&&!/Falta/.test(e.nota),'y ya no dice que falte nada · «'+e.nota+'»');
 chk(e&&e.falta.length===0,'no falta nada del taller');

 /* y el encargado ya no se vuelve a elegir */
 await p.evaluate(()=>{PSV_TMP=null;openPSV('aM',null,'fotos')});
 await p.waitForTimeout(700);
 const enc=await p.evaluate(()=>{const el=document.querySelector('#pv-resp');
   return {tag:el&&el.tagName, txt:el&&el.textContent.trim(),
           select:!!document.querySelector('select#pv-resp')}});
 chk(enc.tag==='DIV'&&!enc.select,'el encargado sale fijo, no en un desplegable · '+enc.tag);
 chk(/Wilson Chapoñán/.test(enc.txt||''),'y con el nombre de quien la tomó · '+enc.txt);

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
