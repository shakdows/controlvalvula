/* Las horas del trabajo: se apuntan solas y salen en los papeles. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1400,height:950}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);

 /* las cuentas */
 const cuentas=await p.evaluate(()=>({
   corta:duracionTxt('08:15','08:45'),
   larga:duracionTxt('08:15','11:40'),
   media:duracionTxt('22:30','01:05'),      // pasó de medianoche
   falta:duracionTxt('08:15',''),
   redonda:duracionTxt('09:00','12:00')}));
 chk(cuentas.corta==='30 min','media hora · '+cuentas.corta);
 chk(cuentas.larga==='3 h 25 min','tres horas y pico · '+cuentas.larga);
 chk(cuentas.media==='2 h 35 min','el turno que pasa de medianoche · '+cuentas.media);
 chk(cuentas.falta==='','sin una punta no se inventa nada');
 chk(cuentas.redonda==='3 h','las horas redondas no dicen «0 min» · '+cuentas.redonda);

 /* se apunta sola al empezar el papel del banco */
 const arranque=await p.evaluate(()=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'Kimberly-Clark Peru S.R.L.'});
   ACTIVOS.push({id:'actT',cli:'cliT',tag:'PSV-106',ser:'2309001',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'ordT',act:'actT',oc:'SOL19191919',mat:'PSV-106',n:'PSV-106',num:106,
                 et:'mant',tipo:'Correctivo',f:hoy,ing:'Christian Soto',
                 tomada:hoy,tomadaH:'09:00',recibida:hoy,recibidaH:'07:50',
                 horas:{ent:'08:15',mant:'09:00',cert:'11:00'}});
   const t={id:'cT',act:'actT',ord:'ordT',tipo:'psv',os:'PSV-106-001',und:'psi',set:150,
            asFound:'152',fecha:hoy,rcFecha:hoy,rcRecibe:'Christian Soto',rcVeredicto:'acepta',
            tests:[{v:'150',pc:'145',foto:'',nota:''},{v:'151',pc:'146',foto:'',nota:''},
                   {v:'150',pc:'145',foto:'',nota:''}],
            firmas:[{rol:'recep',n:'Christian Soto',cargo:'Mecánico',f:hoy,h:'08:45',img:''},
                    {rol:'ejec', n:'Christian Soto',cargo:'Técnico', f:hoy,h:'11:40',img:''}]};
   grabarSinMover(t);
   return {hi:t.horaIni};
 });
 chk(/^\d{2}:\d{2}$/.test(arranque.hi||''),'el banco apunta su hora de inicio · '+arranque.hi);

 /* cada módulo tiene su reloj: entra en su etapa, sale cuando se firma */
 const mod=await p.evaluate(()=>({
   ent:horasDeModulo(CALIBS.find(x=>x.id==='cT'),'ent','recep'),
   mant:horasDeModulo(CALIBS.find(x=>x.id==='cT'),'mant','ejec'),
   sal:horasDeModulo(CALIBS.find(x=>x.id==='cT'),'cert','ejec'),
   todo:horasTrabajo(CALIBS.find(x=>x.id==='cT'))}));
 chk(mod.ent.ini==='08:15'&&mod.ent.fin==='08:45'&&mod.ent.dur==='30 min',
     'prueba de entrada: entra 08:15, firma 08:45 · '+JSON.stringify(mod.ent));
 chk(mod.mant.ini==='09:00'&&mod.mant.fin==='11:00'&&mod.mant.dur==='2 h',
     'mantenimiento: entra 09:00 y acaba al pasar a salida · '+mod.mant.dur);
 chk(mod.sal.ini==='11:00'&&mod.sal.fin==='11:40','prueba de salida: entra 11:00, firma 11:40');
 chk(mod.todo.ini==='08:15'&&mod.todo.fin==='11:40'&&mod.todo.dur==='3 h 25 min',
     'la válvula entera: de la primera entrada a la última firma · '+mod.todo.dur);

 /* y en cada papel */
 const rec=await p.evaluate(()=>(documentoRecepcion(CALIBS.find(x=>x.id==='cT'))||{}).html||'');
 chk(!/Inicio <b>/.test(rec)&&!/Horas de trabajo/.test(rec),
     'el protocolo NO imprime horas: son de gerencia');
 chk(/<i><b>PSV-106<\/b><\/i>/.test(rec),'y la casilla del PSV va sin rótulo · sólo el número');
 chk(/08:45/.test(rec),'protocolo: la firma dice nombre · fecha · hora');

 const cert=await p.evaluate(()=>{
   const c=CALIBS.find(x=>x.id==='cT');
   try{ const d=psvDocumento(c.id); return String((d&&(d.html||d))||'') }catch(e){ return 'ERROR '+e.message }
 });
 chk(!/Horas de trabajo/.test(cert),'el certificado tampoco imprime horas');

 const sal=await p.evaluate(()=>{
   const c=CALIBS.find(x=>x.id==='cT');
   try{ const d=documentoSalida(c.id); return String((d&&(d.html||d))||'') }catch(e){ return 'ERROR '+e.message }
 });
 chk(!/Horas de trabajo/.test(String(sal))&&!String(sal).startsWith('ERROR'),
     'la prueba de salida tampoco'+(String(sal).startsWith('ERROR')?' ('+String(sal).slice(0,60)+')':''));

 const inf=await p.evaluate(()=>{
   const o=ORDENES.find(x=>x.id==='ordT'); o.calib='cT';
   try{ const d=documentoInforme('ordT',['ordT']); return (d&&(d.html||d))||'' }catch(e){ return 'ERROR '+e.message }
 });
 chk(!/Horas de trabajo/.test(String(inf)),'el informe del cliente tampoco las lleva');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
