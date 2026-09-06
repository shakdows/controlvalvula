const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="50"><path d="M8 40C40 4 60 46 90 16" fill="none" stroke="#102d69" stroke-width="3"/></svg>').toString('base64');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1200,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(800);
 const html=await p.evaluate(R=>{
   CLIENTES.push({id:'kal',n:'Kallpa Generación SA',ind:'Energía'});
   ACTIVOS.push({id:'aK',cli:'kal',tag:'PSV-40AA101',ser:'C156933',cl:'seguridad',
     mod:Object.keys(MODELOS)[0]||'',setPress:'150',setUnd:'psi'});
   const o={id:'oI',act:'aK',cli:'kal',et:'final',f:'2026-08-27',mat:'PSV-105',n:'PSV-105',num:105,
     calib:'pvI', conclu:'La válvula queda operativa y lista para reinstalar.',
     recom:'Programar la próxima calibración a los doce meses.'};
   ORDENES.push(o);
   CALIBS.push({id:'pvI',act:'aK',tipo:'psv',cli:'kal',ord:'oI',fecha:'2026-08-27',
     setEsp:'150',und:'psi',veredicto:'aprobado',respNombre:'Christian Soto',
     coment:'Se cambió el resorte.',
     tests:[{v:'149',pc:'150'},{v:'150',pc:'150'},{v:'151',pc:'150'}],
     firmas:[{rol:'ejec',n:'Christian Soto',cargo:'Técnico',f:'2026-08-27',img:R}]});
   return documentoInforme('oI').html;
 },R);
 const q=await b.newPage({viewport:{width:794,height:1123}});
 await q.setContent(html,{waitUntil:'networkidle'});
 await q.emulateMedia({media:'print'}); await q.waitForTimeout(400);
 const r=await q.evaluate(()=>{
   const h=[...document.querySelectorAll('h2')];
   const rec=h.find(x=>/Recomendaciones/i.test(x.textContent));
   const con=h.find(x=>/Conclusiones/i.test(x.textContent));
   const tras=el=>{const o=[];let n=el.nextElementSibling;
     while(n&&n.tagName!=='H2'){o.push(n.tagName+':'+n.textContent.replace(/\s+/g,' ').trim().slice(0,52));n=n.nextElementSibling}
     return o};
   return {conclu:tras(con), recom:tras(rec)};
 });
 console.log('CONCLUSIONES, en orden:'); r.conclu.forEach(x=>console.log('  '+x));
 console.log('RECOMENDACIONES, en orden:'); r.recom.forEach(x=>console.log('  '+x));
 const ok1=r.recom[0]&&r.recom[0].startsWith('UL')&&r.recom[1]&&/doce meses/.test(r.recom[1]);
 /* Son dos: la conclusión del formato —la frase con las cuentas del
    trabajo— y, debajo, la que escribió gerencia. El DVAD-SER-002 no
    lleva lista fija de conclusiones, así que el portal no la pone. */
 const ok2=r.conclu[0]&&/Se realizó el mantenimiento/.test(r.conclu[0])&&r.conclu[1]&&/reinstalar/.test(r.conclu[1]);
 console.log((ok1?'✓':'✗')+' recomendaciones: primero las fijas, después la suya');
 console.log((ok2?'✓':'✗')+' conclusiones: la del formato y después la suya');
 console.log('errores JS:', errs.length?errs.join(' | '):'ninguno');
 await b.close();
})();
