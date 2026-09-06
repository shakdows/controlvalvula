/* El celular: la página se pinta ANTES de que baje la nube.
   Los desplegables se armaban vacíos y se quedaban vacíos. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[];
const chk=(c,t)=>(c?ok:mal).push(t);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});

 /* 1 · se entra con la caja VACÍA, como un celular recién abierto
        que todavía no ha bajado nada */
 await p.evaluate(()=>{
   CLIENTES.length=0; ACTIVOS.length=0; ORDENES.length=0;
   abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false);
 });
 await p.waitForTimeout(600);
 await p.evaluate(()=>go('wo')); await p.waitForTimeout(300);
 const vacio=await p.evaluate(()=>document.querySelector('#woCli').options.length);
 chk(vacio===1,`sin clientes el desplegable trae sólo «Todos» (${vacio})`);

 /* 2 · ahora BAJAN los clientes de la nube y se repinta */
 await p.evaluate(()=>{
   CLIENTES.push({id:'cliA',n:'Kimberly-Clark Peru S.R.L.'},
                 {id:'cliB',n:'Kallpa Generación SA'},
                 {id:'cliC',n:'SAPE'});
   renderAll();
 });
 await p.waitForTimeout(300);
 const wo=await p.evaluate(()=>[...document.querySelector('#woCli').options].map(o=>o.textContent));
 chk(wo.length===4&&wo.includes('SAPE'),'Órdenes de trabajo: salen los 3 clientes · '+wo.join(' / '));

 await p.evaluate(()=>go('cal')); await p.waitForTimeout(250);
 const cal=await p.evaluate(()=>[...document.querySelector('#calCli').options].map(o=>o.textContent));
 chk(cal.length===4,'Calibraciones: salen los 3 clientes · '+cal.length+' opciones');

 await p.evaluate(()=>go('assets')); await p.waitForTimeout(250);
 const fc=await p.evaluate(()=>[...document.querySelector('#fCli').options].map(o=>o.textContent));
 chk(fc.length===4,'Válvulas: salen los 3 clientes · '+fc.length+' opciones');

 /* 3 · el filtro elegido sobrevive a que la lista se rehaga */
 await p.evaluate(()=>{ S.woCli='cliB'; go('wo'); });
 await p.waitForTimeout(250);
 await p.evaluate(()=>{ CLIENTES.push({id:'cliD',n:'Cliente nuevo'}); renderAll() });
 await p.waitForTimeout(250);
 const sigue=await p.evaluate(()=>({v:document.querySelector('#woCli').value,
                                    n:document.querySelector('#woCli').options.length}));
 chk(sigue.v==='cliB'&&sigue.n===5,`el filtro elegido no se pierde al rehacer (${sigue.v} · ${sigue.n})`);

 /* 4 · y el desplegable sigue cambiando el filtro */
 await p.selectOption('#woCli','cliC'); await p.waitForTimeout(250);
 const f=await p.evaluate(()=>S.woCli);
 chk(f==='cliC','elegir en el desplegable sigue filtrando · '+f);

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close();
 process.exit(mal.length?1:0);
})();
