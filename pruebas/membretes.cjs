const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="50"><path d="M8 40C40 4 60 46 90 16" fill="none" stroke="#102d69" stroke-width="3"/></svg>').toString('base64');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1200,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(800);
 const docs=await p.evaluate(R=>{
   CLIENTES.push({id:'kal',n:'Kallpa Generación SA',ruc:'20510376521',ind:'Energía'});
   ACTIVOS.push({id:'aK',cli:'kal',tag:'11LAB10AA101',ser:'C156933',cl:'seguridad',
     mod:Object.keys(MODELOS)[0]||'',setPress:'150',setUnd:'psi'});
   PROYECTOS.push({id:'pyA',cli:'kal',oc:'SOL18608532',tipo:'Preventivo',f:'2026-09-03'});
   ORDENES.push({id:'oC',act:'aK',cli:'kal',pry:'pyA',oc:'SOL18608532',et:'final',f:'2026-09-03',
                 mat:'PSV-107',n:'PSV-107',num:107,calib:'pvC'});
   CALIBS.push({id:'pvC',act:'aK',tipo:'psv',cli:'kal',ord:'oC',fecha:'2026-09-03',
     setEsp:'150',und:'psi',veredicto:'aprobado',respNombre:'Christian Soto',asFound:'149',
     rcVeredicto:'acepta',rcFecha:'2026-09-01',
     tests:[{v:'149',pc:'150'},{v:'150',pc:'150'},{v:'151',pc:'150'}],
     firmas:[{rol:'ejec',n:'Christian Soto',cargo:'Técnico',f:'2026-09-03',img:R},
             {rol:'recep',n:'Jose Rojas',cargo:'Técnico',f:'2026-09-01',img:R}]});
   const out={};
   out['certificado']      =psvDocumento('pvC').html;
   out['protocolo entrada']=documentoRecepcion(CALIBS[0]).html;
   out['informe DVAD']     =documentoInforme('oC').html;
   out['prueba de salida'] =documentoSalida('pvC').html;
   try{ out['valvulario']  =valvularioHTML? valvularioHTML('kal') : '' }catch(e){}
   return out;
 },R);
 const CAJAS=[];
 for(const [nombre,html] of Object.entries(docs)){
   if(!html){console.log(nombre.padEnd(20),'— no se pudo generar en la prueba');continue}
   const q=await b.newPage({viewport:{width:794,height:1123}});
   await q.setContent(html,{waitUntil:'networkidle'});
   await q.emulateMedia({media:'print'}); await q.waitForTimeout(300);
   const r=await q.evaluate(()=>{
     const m=document.querySelector('.mem');
     if(!m)return {mem:false};
     const b=m.getBoundingClientRect();
     return {mem:true, alto:Math.round(b.height), ancho:Math.round(b.width),
       titulo:(m.querySelector('.ti')||{textContent:''}).textContent.replace(/\s+/g,' ').trim().slice(0,54),
       caja:[...m.querySelectorAll('.dt span,.dt b,.dt i')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).join(' | ').slice(0,90),
       reja:getComputedStyle(m).borderTopWidth};
   });
   console.log(nombre.padEnd(20), r.mem?`✓ ${r.ancho}×${r.alto} · borde ${r.reja}`:'✗ SIN MEMBRETE');
   if(r.mem){console.log('  título:',r.titulo);console.log('  caja  :',r.caja);CAJAS.push(nombre+' → '+r.caja)}
   if(nombre==='certificado')await q.screenshot({path:'/tmp/memb-cert.png',clip:{x:0,y:0,width:794,height:190}});
   if(nombre==='protocolo entrada')await q.screenshot({path:'/tmp/memb-recep.png',clip:{x:0,y:0,width:794,height:190}});
   await q.close();
 }
 /* Ningún formato controlado puede fechar su versión con el día en que
   se imprime: el mismo papel saldría siendo de dos versiones distintas
   según el día. */
{
  const hoy=new Date();
  const dd=String(hoy.getDate()).padStart(2,'0'), mm=String(hoy.getMonth()+1).padStart(2,'0');
  const patron=new RegExp(dd+'/'+mm+'/'+hoy.getFullYear());
  const conFecha=CAJAS.filter(x=>patron.test(x));
  console.log((conFecha.length?'✗ ':'✓ ')+'ningún membrete fecha su versión con el día'+
    (conFecha.length?' · '+conFecha.join(' | '):''));
}
console.log('errores JS:', errs.length?errs.join(' | '):'ninguno');
 await b.close();
})();
