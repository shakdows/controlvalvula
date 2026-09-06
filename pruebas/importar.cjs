/* Subir el Excel del cliente ESTANDO DENTRO del cliente, y que las
   válvulas queden en esa empresa y en ninguna otra. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);

/* La hoja del cliente: mismo formato para todas las empresas. */
const CSV=[
 'Cliente,Área / unidad,Tag,N.º de serie,Marca,Modelo,Tipo / clase,Tamaño,Rating,Cv,Rango / set,Falla a,Criticidad',
 'Kimberly-Clark,Calderas,PSV-501,C-88-4471,Consolidated,1900,seguridad,2"x3",300,,150 psig,,Crítica',
 'Kimberly-Clark,Calderas,PSV-502,C-88-4472,Consolidated,1900,seguridad,1"x2",300,,120 psig,,Alta',
 'Kimberly-Clark,Secado,TV-561B,N-11-267173,Masoneilan,21000,control,2",600,39,7-15 psi,OPEN,Media',
 'Kimberly-Clark,Secado,,,Consolidated,1900,seguridad,3/8",150,,90 psig,,Baja'
].join('\n');

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1500,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 await p.evaluate(()=>{
   CLIENTES.push({id:'cliK',n:'Kimberly-Clark Peru S.R.L.',areas:{a1:'Calderas',a2:'Secado'}},
                 {id:'cliZ',n:'Otra empresa',areas:{z1:'Planta'}});
   renderAll();
 });

 /* sin la librería de Excel, como una tablet recién instalada */
 await p.evaluate(()=>{ window.XLSX=undefined });

 /* se entra al cliente y se va a su pestaña Importar */
 await p.evaluate(()=>{ enterClient('cliK','imp') });
 await p.waitForTimeout(500);
 const dentro=await p.evaluate(()=>({
   cli:S.inCli, pag:S.page,
   pestana:/Importar/i.test((document.querySelector('#subNav')||{}).textContent||'')}));
 chk(dentro.cli==='cliK'&&dentro.pag==='imp','se entra a Importar desde dentro del cliente');
 chk(dentro.pestana,'y «Importar» está en el menú de esa empresa');

 /* se sube la hoja de esa empresa */
 await p.setInputFiles('#file',{name:'valvulas-kimberly.csv',mimeType:'text/csv',
                                buffer:Buffer.from(CSV,'utf-8')});
 await p.waitForTimeout(700);

 const mapa=await p.evaluate(()=>{
   const filas=[...document.querySelectorAll('#imp2 .maprow')].map(r=>({
     campo:r.querySelector('.lb').textContent.trim(),
     col:(r.querySelector('select option:checked')||{}).textContent}));
   const c=document.querySelector('#impCli');
   return {visible:document.querySelector('#imp2').style.display!=='none',
           filas, cliFijo:c&&c.tagName==='INPUT'?c.value:(c?'select: '+c.value:'—'),
           n:rawRows.length};
 });
 chk(mapa.visible,'el CSV se lee SIN la librería de Excel · sale el mapeo');
 chk(mapa.n===4,'con sus cuatro válvulas · '+mapa.n);
 const dice=k=>(mapa.filas.find(f=>f.campo===k)||{}).col;
 chk(dice('Tag')==='Tag','detecta el Tag solo · '+dice('Tag'));
 chk(dice('N.º de serie')==='N.º de serie','y el número de serie · '+dice('N.º de serie'));
 chk(dice('Marca')==='Marca'&&dice('Modelo')==='Modelo','marca y modelo · '+dice('Marca')+' / '+dice('Modelo'));
 chk(dice('Tamaño')==='Tamaño'&&dice('Rating')==='Rating','tamaño y rating');
 chk(dice('Área')==='Área / unidad','y el área · '+dice('Área'));
 chk(mapa.cliFijo==='cliK','el cliente queda fijado al que estás dentro · '+mapa.cliFijo);

 /* validar y consolidar */
 await p.evaluate(()=>validar()); await p.waitForTimeout(500);
 const val=await p.evaluate(()=>({
   txt:document.querySelector('#imp3').textContent.replace(/\s+/g,' ').trim().slice(0,140),
   botones:[...document.querySelectorAll('#imp3 button')].map(x=>x.textContent.trim())}));
 chk(/3\s*Filas completas/.test(val.txt)&&/1\s*Con datos faltantes/.test(val.txt),
     'valida y separa lo que le falta algo · '+val.txt.slice(0,70));

 const antes=await p.evaluate(()=>ACTIVOS.length);
 await p.evaluate(()=>{
   const b=[...document.querySelectorAll('#imp3 button')].find(x=>/Consolidar|Importar|Confirmar/i.test(x.textContent));
   if(b)b.click();
 });
 await p.waitForTimeout(700);

 const creadas=await p.evaluate(a=>{
   const nuevas=ACTIVOS.slice(a);
   return {n:nuevas.length,
     todasDelCliente:nuevas.every(x=>x.cli==='cliK'),
     enOtra:ACTIVOS.filter(x=>x.cli==='cliZ').length,
     tags:nuevas.map(x=>x.tag),
     una:nuevas.find(x=>x.tag==='PSV-501')||null,
     areas:[...new Set(nuevas.map(x=>x.ar))]};
 },antes);
 chk(creadas.n===4,'se crean las cuatro válvulas · '+creadas.n);
 chk(creadas.todasDelCliente,'todas dentro de Kimberly-Clark');
 chk(creadas.enOtra===0,'y ninguna se cuela en la otra empresa');
 chk(creadas.una&&creadas.una.ser==='C-88-4471'&&creadas.una.sz==='2"x3"'&&creadas.una.rt==='300',
     'con su serie, tamaño y rating · '+JSON.stringify(creadas.una&&{s:creadas.una.ser,t:creadas.una.sz,r:creadas.una.rt}));
 chk(creadas.una&&creadas.una.rng==='150 psig','y su rango · '+(creadas.una||{}).rng);
 chk(creadas.tags.filter(t=>/^S\/T-|^SIN/i.test(t||'')).length===1||creadas.tags.some(t=>!/^PSV|^TV/.test(t)),
     'la fila sin tag ni serie entra con código provisional · '+creadas.tags.join(' / '));
 chk(creadas.areas.length>=1,'reparte por área · '+creadas.areas.join(', '));

 /* y sobrevive a recargar: quedó guardada */
 const guardadas=await p.evaluate(()=>{
   const j=JSON.stringify(fotoDatos());
   return (JSON.parse(j).ACTIVOS||[]).filter(x=>x.cli==='cliK').length;
 });
 chk(guardadas===4,'y quedan guardadas en el equipo · '+guardadas);

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
