/* Las horas, sólo para gerencia y en su pestaña. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
const sembrar=()=>{
  const hoy=HOY.toISOString().slice(0,10);
  CLIENTES.push({id:'cliA',n:'Kimberly-Clark Peru S.R.L.'},{id:'cliB',n:'Kallpa Generación SA'});
  ACTIVOS.push({id:'a1',cli:'cliA',tag:'PSV-201',ser:'19096',mod:Object.keys(MODELOS)[0]},
               {id:'a2',cli:'cliB',tag:'PSV-202',ser:'1900', mod:Object.keys(MODELOS)[0]});
  ORDENES.push(
    {id:'o1',act:'a1',oc:'OC-450',mat:'PSV-201',n:'PSV-201',num:201,et:'final',f:hoy,
     ing:'Christian Soto',recibe:'Christian Soto',pasos:['ent','mant','cert'],
     hist:{ent:hoy,mant:hoy,cert:hoy},horas:{ent:'08:15',mant:'09:00',cert:'11:00'},calib:'c1'},
    {id:'o2',act:'a2',oc:'OC-451',mat:'PSV-202',n:'PSV-202',num:202,et:'mant',f:'2025-04-10',
     ing:'Jose Rojas',pasos:['ent','mant','cert'],
     hist:{ent:'2025-04-10',mant:'2025-04-10'},horas:{ent:'07:30',mant:'08:00'},calib:'c2'});
  CALIBS.push(
    {id:'c1',act:'a1',ord:'o1',tipo:'psv',os:'PSV-201-001',fecha:hoy,
     firmas:[{rol:'recep',n:'Christian Soto',f:hoy,h:'08:45',img:''},
             {rol:'ejec', n:'Christian Soto',f:hoy,h:'11:40',img:''}]},
    {id:'c2',act:'a2',ord:'o2',tipo:'psv',os:'PSV-202-001',fecha:'2025-04-10',
     firmas:[{rol:'recep',n:'Jose Rojas',f:'2025-04-10',h:'07:50',img:''}]});
  renderAll();
};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1500,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 await p.evaluate(sembrar);
 await p.waitForTimeout(300);

 /* sólo gerencia la ve */
 const ve=await p.evaluate(()=>{
   const a=document.querySelector('#nav a[data-p="horas"]');
   const r={};
   ['admin','tec','com','cliente'].forEach(rol=>{ applyRole(rol);
     r[rol]=a.style.display!=='none'; });
   applyRole('admin'); return r;
 });
 chk(ve.admin,'gerencia ve la pestaña');
 chk(!ve.tec&&!ve.com&&!ve.cliente,
     'los demás no la ven · tec:'+ve.tec+' com:'+ve.com+' cliente:'+ve.cliente);

 await p.evaluate(()=>go('horas'));
 await p.waitForTimeout(400);

 /* una fila por válvula Y por módulo */
 const filas=await p.evaluate(()=>[...document.querySelectorAll('#hoLista tbody tr')]
   .map(tr=>[...tr.children].map(td=>td.textContent.replace(/\s+/g,' ').trim())));
 chk(filas.length===5,'una fila por válvula y módulo · '+filas.length);
 const ent=filas.find(f=>/PSV-201/.test(f[3])&&/Prueba de entrada/.test(f[5]));
 chk(ent&&ent[7]==='08:15'&&ent[8]==='08:45'&&/30 min/.test(ent[9]),
     'entrada de la 201: entra 08:15, firma 08:45 · '+(ent||[]).slice(7).join(' / '));
 const mant=filas.find(f=>/PSV-201/.test(f[3])&&/Mantenimiento/.test(f[5]));
 chk(mant&&/^2 h$/.test(mant[9]),'el mantenimiento acaba al pasar a salida, no se cuenta dos veces · '+(mant||[])[9]);
 const abierto=filas.find(f=>/PSV-202/.test(f[3])&&/Mantenimiento/.test(f[5]));
 chk(abierto&&/sin firmar/.test(abierto[8])&&/abierto/.test(abierto[9]),
     'lo que no se firmó sale como abierto · '+(abierto||[]).slice(8).join(' / '));

 /* el filtro por empresa */
 const porCli=await p.evaluate(()=>{S.hoCli='cliB';renderHoras();
   return document.querySelectorAll('#hoLista tbody tr').length});
 chk(porCli===2,'filtrando por empresa quedan sólo las suyas · '+porCli);

 /* por año y por mes */
 const porAnio=await p.evaluate(()=>{S.hoCli='';S.hoAnio='2025';renderHoras();
   return [...document.querySelectorAll('#hoLista tbody tr')].map(t=>t.children[0].textContent.trim())});
 chk(porAnio.length===2&&porAnio.every(x=>/2025/.test(x)),'por año · '+porAnio.join(' / '));
 const porMes=await p.evaluate(()=>{S.hoAnio='';S.hoMes='04';renderHoras();
   return document.querySelectorAll('#hoLista tbody tr').length});
 chk(porMes===2,'por mes · '+porMes);
 const porDia=await p.evaluate(()=>{S.hoMes='';S.hoDia='2025-04-10';renderHoras();
   return document.querySelectorAll('#hoLista tbody tr').length});
 chk(porDia===2,'por día · '+porDia);
 const limpio=await p.evaluate(()=>{horasLimpiar();
   return document.querySelectorAll('#hoLista tbody tr').length});
 chk(limpio===5,'y se quitan los filtros · '+limpio);

 /* el total en horas */
 const tot=await p.evaluate(()=>document.querySelector('#hoStats').textContent.replace(/\s+/g,' ').trim());
 chk(/3 h 30 min/.test(tot),'las horas contadas salen sumadas · '+tot.slice(0,60));

 /* exporta */
 const exp=await p.evaluate(()=>{
   let libro=null; const X=window.XLSX;
   window.XLSX=undefined;
   const orig=URL.createObjectURL; let bajo=false;
   URL.createObjectURL=b=>{bajo=true;return 'blob:x'};
   const cl=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){libro=this.download};
   horasExcel();
   URL.createObjectURL=orig; HTMLAnchorElement.prototype.click=cl; window.XLSX=X;
   return {libro,bajo};
 });
 chk(exp.bajo&&/^Horas de trabajo/.test(exp.libro||''),'se exporta · '+exp.libro);

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
