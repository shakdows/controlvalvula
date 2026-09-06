/* Un solo tamaño —media hoja A4— y dos copias por defecto. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1200,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 await p.evaluate(()=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'Kimberly-Clark Peru S.R.L.'});
   ACTIVOS.push({id:'actT',cli:'cliT',tag:'PSV-106',ser:'2309001',mod:Object.keys(MODELOS)[0]});
   PROYECTOS.push({id:'pyT',oc:'SOL19191919',cli:'cliT',tipo:'Correctivo',f:hoy});
   ORDENES.push({id:'ordT',act:'actT',pry:'pyT',oc:'SOL19191919',mat:'PSV-106-001',
                 et:'oc',tipo:'Correctivo',f:hoy});
   renderAll(); imprimirEtiqueta('actT');
 });
 await p.waitForTimeout(500);

 const t=await p.evaluate(()=>[...document.querySelectorAll('#mBody .ps-chip')].map(c=>c.textContent.trim()));
 chk(t.length===1&&t[0]==='Media hoja A4','sólo queda «Media hoja A4» · '+t.join(' / '));

 const st=await p.evaluate(()=>({tam:ETIQ.tam,cop:ETIQ.copias,
   input:+document.querySelector('#etCop').value,
   marcada:!!document.querySelector('#mBody .ps-chip.on')}));
 chk(st.tam==='a5','el tamaño por defecto es media hoja · '+st.tam);
 chk(st.cop===2&&st.input===2,'por defecto salen 2 copias · '+st.cop);
 chk(st.marcada,'el tamaño sale marcado');

 const pie=await p.evaluate(()=>document.querySelector('#mBody p.hint').textContent.replace(/\s+/g,' ').trim());
 chk(/2 etiquetas · 1 hoja A4/.test(pie),'dos etiquetas llenan una hoja A4 · '+pie.slice(0,40));

 const bot=await p.evaluate(()=>document.querySelector('#mFoot .btn:last-child').textContent.trim());
 chk(/Imprimir 2/.test(bot),'el botón dice «Imprimir 2» · '+bot);

 const prev=await p.evaluate(()=>document.querySelectorAll('#mBody .et-prev .etq').length
                              ||document.querySelectorAll('#mBody .et-prev > *').length);
 chk(prev>=1,'la vista previa sigue dibujándose · '+prev);

 /* y la hoja que se manda a imprimir sale con las dos */
 const hoja=await p.evaluate(()=>{
   const orig=window.open; let html='';
   window.open=()=>({document:{write:t=>{html=t},close(){}},focus(){},print(){},close(){}});
   try{ etiquetasAImprimir() }catch(e){ html='ERROR '+e.message }
   window.open=orig; return html;
 });
 const cuenta=(hoja.match(/PSV-106/g)||[]).length;
 chk(cuenta>=2,'la hoja lleva las dos etiquetas · '+cuenta+' veces el tag');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
