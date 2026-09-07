/* Lo escrito no se pierde porque entre una llamada.
   Se comprueba lo que de verdad pasa en un celular: la pantalla se va
   —el sistema manda «visibilitychange» y a veces «pagehide» o
   «freeze», casi nunca «beforeunload»— y en ese instante hay que
   tenerlo TODO en el archivo, no sólo el formulario del ensayo. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:420,height:860}});   // un celular
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),true));
 await p.waitForTimeout(700);

 await p.evaluate(()=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'SAPE'});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-40AA101',ser:'C1',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'mant',f:hoy,
     tipo:'Preventivo',ing:'Jose Rojas',pasos:['ent','mant','cert'],hist:{ent:hoy,mant:hoy}});
   guardarLocal(); renderAll();
 });
 await p.waitForTimeout(400);

 /* Entra la llamada: el sistema esconde la pestaña. Lo escrito hace
    un instante todavía esperaba su turno para grabarse. */
 const escondida=await p.evaluate(async()=>{
   ordenTexto('oT','conclu','La válvula quedó operativa.');
   ordenTexto('oT','recom','Cambiar el resorte.');
   Object.defineProperty(document,'hidden',{value:true,configurable:true});
   document.dispatchEvent(new Event('visibilitychange'));
   /* y a partir de aquí el sistema ya no deja correr nada más */
   ESPERANDO.forEach(t=>clearTimeout(t)); ESPERANDO.clear();
   await new Promise(r=>setTimeout(r,300));
   let g={}; try{ g=JSON.parse(localStorage.getItem(LS_KEY)||'{}') }catch(e){}
   const o=(g.ORDENES||[]).find(x=>x.id==='oT');
   return {recom:o&&o.recom, conclu:o&&o.conclu};
 });
 chk(escondida.recom==='Cambiar el resorte.',
     'al irse la pantalla se graba lo último escrito · '+escondida.recom);
 chk(escondida.conclu==='La válvula quedó operativa.',
     'y lo de antes sigue ahí');

 /* Y por «pagehide», que es el que manda al cerrar de golpe. */
 const alCerrar=await p.evaluate(async()=>{
   Object.defineProperty(document,'hidden',{value:false,configurable:true});
   ordenTexto('oT','pend','Falta el acta.');
   window.dispatchEvent(new Event('pagehide'));
   ESPERANDO.forEach(t=>clearTimeout(t)); ESPERANDO.clear();
   await new Promise(r=>setTimeout(r,300));
   let g={}; try{ g=JSON.parse(localStorage.getItem(LS_KEY)||'{}') }catch(e){}
   const o=(g.ORDENES||[]).find(x=>x.id==='oT');
   return o&&o.pend;
 });
 chk(alCerrar==='Falta el acta.','y al cerrarse de golpe, igual · '+alCerrar);

 /* Y «freeze», el que usa Chrome en Android al dejar la pestaña atrás. */
 const alCongelar=await p.evaluate(async()=>{
   ordenTexto('oT','conclu','Se entrega precintada.');
   document.dispatchEvent(new Event('freeze'));
   ESPERANDO.forEach(t=>clearTimeout(t)); ESPERANDO.clear();
   await new Promise(r=>setTimeout(r,300));
   let g={}; try{ g=JSON.parse(localStorage.getItem(LS_KEY)||'{}') }catch(e){}
   const o=(g.ORDENES||[]).find(x=>x.id==='oT');
   return o&&o.conclu;
 });
 chk(alCongelar==='Se entrega precintada.','y al congelarla el sistema, también · '+alCongelar);

 /* Que no dependa de tener un ensayo abierto: se puede estar
    corrigiendo un cliente o una OC. */
 const sinEnsayo=await p.evaluate(async()=>{
   PSV_TMP=null;
   CLIENTES.find(c=>c.id==='cliT').n='SAPE INDUSTRIAL';
   guardarTodoYa();
   await new Promise(r=>setTimeout(r,200));
   let g={}; try{ g=JSON.parse(localStorage.getItem(LS_KEY)||'{}') }catch(e){}
   return ((g.CLIENTES||[]).find(x=>x.id==='cliT')||{}).n;
 });
 chk(sinEnsayo==='SAPE INDUSTRIAL',
     'y sin ensayo abierto se graba igual · '+sinEnsayo);

 /* Y al volver, ahí está: se recarga como cuando se reabre la app. */
 await p.reload({waitUntil:'networkidle'});
 await p.waitForTimeout(1500);
 const vuelta=await p.evaluate(()=>{
   const o=ORDENES.find(x=>x.id==='oT');
   return o?{conclu:o.conclu,recom:o.recom,pend:o.pend}:null;
 });
 chk(vuelta&&vuelta.conclu==='Se entrega precintada.',
     'al volver a abrir la aplicación sigue todo · '+(vuelta&&vuelta.conclu));
 chk(vuelta&&vuelta.recom==='Cambiar el resorte.','las recomendaciones también');
 chk(vuelta&&vuelta.pend==='Falta el acta.','y los pendientes');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
