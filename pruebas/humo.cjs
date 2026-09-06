const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const errs=[];
 for(const rol of ['admin','tec','com','cliente']){
   const p=await b.newPage({viewport:{width:1500,height:1000}});
   p.on('pageerror',e=>errs.push(rol+': '+e.message));
   await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
   await p.evaluate(r=>abrirSesion(CUENTAS.find(x=>x.perfil===r),false),rol);
   await p.waitForTimeout(700);
   const pgs=await p.evaluate(()=>[...document.querySelectorAll('#nav > a')].map(a=>a.dataset.p));
   for(const g of pgs){ await p.evaluate(x=>go(x),g); await p.waitForTimeout(220); }
   await p.evaluate(()=>{if(CLIENTES[0])enterClient(CLIENTES[0].id)});
   await p.waitForTimeout(500);
   const sub=await p.evaluate(()=>CLI_TABS.map(([k])=>k));
   for(const g of sub){ await p.evaluate(x=>go(x),g); await p.waitForTimeout(200); }
   await p.evaluate(()=>goSettings()); await p.waitForTimeout(300);
   for(const t of ['perfil','seguridad','org','notif']){ await p.evaluate(x=>setTab(x),t); await p.waitForTimeout(180); }
   console.log(rol.padEnd(8), pgs.length+' páginas ·', sub.length+' subpáginas · ajustes ✓');
   await p.close();
 }
 console.log('\nerrores JS:', errs.length?errs.join('\n  '):'ninguno ✓');
 await b.close();
})();
