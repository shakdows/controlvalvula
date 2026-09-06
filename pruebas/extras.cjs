/* Arenado y pintura: se eligen por válvula y se distinguen después. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1400,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 await p.evaluate(()=>{
   CLIENTES.push({id:'cliT',n:'Kimberly-Clark Peru S.R.L.'});
   ACTIVOS.push({id:'a1',cli:'cliT',tag:'PSV-201',ser:'19096',mod:Object.keys(MODELOS)[0]},
                {id:'a2',cli:'cliT',tag:'PSV-202',ser:'1900', mod:Object.keys(MODELOS)[0]});
   renderAll(); go('wo'); openProyecto();
 });
 await p.waitForTimeout(500);
 await p.selectOption('#pyCli','cliT').catch(()=>{});
 await p.waitForTimeout(400);

 /* el segundo renglón está, y viene apagado */
 const filas=await p.evaluate(()=>({
   pasos:document.querySelectorAll('.ck-paso[data-act="a1"]').length,
   extras:[...document.querySelectorAll('.ck-extra[data-act="a1"]')].map(x=>({v:x.value,on:x.checked})),
   rotulo:(document.querySelector('.pasos-f.extras .extras-t')||{}).textContent}));
 chk(filas.pasos===3,'siguen las tres casillas de siempre · '+filas.pasos);
 chk(filas.extras.length===2&&filas.extras.map(x=>x.v).join()==='arenado,pintura',
     'y debajo, arenado y pintura · '+JSON.stringify(filas.extras));
 chk(filas.extras.every(x=>!x.on),'apagadas de salida: nadie arena por descuido');
 chk(filas.rotulo==='Además','el renglón lleva su rótulo · '+filas.rotulo);

 /* se marca sólo en una válvula y se abre la OC */
 await p.evaluate(()=>{
   document.querySelector('.pyChk[value="a1"]').click();
   document.querySelector('.pyChk[value="a2"]').click();
   document.querySelector('.ck-extra[data-act="a1"][value="arenado"]').click();
   document.querySelector('.ck-extra[data-act="a1"][value="pintura"]').click();
   document.querySelector('#pyOC').value='OC-4500231889';
 });
 await p.waitForTimeout(200);
 const creada=await p.evaluate(()=>{ guardarProyecto();
   return ORDENES.filter(o=>o.pry).map(o=>({act:o.act,ex:extrasDe(o)})) });
 chk(creada.length===2,'se crearon las dos órdenes · '+creada.length);
 const una=creada.find(x=>x.act==='a1'), otra=creada.find(x=>x.act==='a2');
 chk(una&&una.ex.join()==='arenado,pintura','la PSV-201 se arena y se pinta · '+(una||{}).ex);
 chk(otra&&otra.ex.length===0,'la PSV-202 va sólo a calibración · '+JSON.stringify((otra||{}).ex));

 /* la tarjeta del tablero lo dice */
 await p.evaluate(()=>{closeModal();renderAll();go('wo')});
 await p.waitForTimeout(400);
 const kb=await p.evaluate(()=>[...document.querySelectorAll('#kanban .wo')]
   .map(x=>x.textContent.replace(/\s+/g,' ').trim()));
 chk(kb.some(t=>/Arenado/.test(t)&&/Pintura/.test(t)),'la tarjeta del tablero lo dice · '+kb.join(' // ').slice(0,120));

 /* y el informe de la OC lo distingue válvula por válvula */
 const py=await p.evaluate(()=>PROYECTOS[0].id);
 await p.evaluate(i=>informeProyecto(i),py);
 await p.waitForTimeout(400);
 const tabla=await p.evaluate(()=>[...document.querySelectorAll('#mBody table.grid tbody tr')]
   .map(tr=>[...tr.children].map(td=>td.textContent.replace(/\s+/g,' ').trim())));
 chk(tabla.length===2,'el informe trae las dos válvulas · '+tabla.length);
 const f1=tabla.find(r=>/PSV-201/.test(r.join(' ')));
 const f2=tabla.find(r=>/PSV-202/.test(r.join(' ')));
 chk(f1&&/Arenado/.test(f1[2])&&/Pintura/.test(f1[2]),'la que se arena y se pinta lo dice · '+(f1||[])[2]);
 chk(f2&&/calibración/i.test(f2[2]),'la otra dice sólo calibración · '+(f2||[])[2]);

 /* y el informe impreso también */
 const doc=await p.evaluate(i=>{
   const orig=window.open; let html='';
   window.open=()=>({document:{write:t=>{html=t},close(){}},focus(){},print(){},close(){}});
   try{ informeProyectoPDF(i) }catch(e){ html='ERROR '+e.message }
   window.open=orig; return html;
 },py);
 chk(/<th>Trabajo<\/th>/.test(doc),'el informe impreso abre su columna Trabajo');
 chk(/Calibración \+ Arenado \+ Pintura/.test(doc),'y dice qué lleva cada una');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
