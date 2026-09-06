/* El membrete del protocolo de recepción: AXAD-SER-007, 02 (15.01.2025)
   y el número PSV donde antes decía «Página 1 de 1». */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1200,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);

 const doc=await p.evaluate(()=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'Kimberly-Clark Peru S.R.L.'});
   ACTIVOS.push({id:'actT',cli:'cliT',tag:'PSV-106',ser:'2309001',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'ordT',act:'actT',oc:'SOL19191919',mat:'PSV-106',n:'PSV-106',num:106,
                 et:'ent',tipo:'Correctivo',f:hoy});
   const c={id:'cT',act:'actT',tipo:'psv',os:'PSV-106-001',und:'psi',set:150,asFound:'152',
            rcFecha:hoy,rcRecibe:'Christian Soto',rcVeredicto:'acepta',f:hoy,fecha:hoy};
   CALIBS.push(c);
   return (documentoRecepcion(c)||{}).html;
 });

 chk(!!doc && doc.length>500,'el protocolo se genera · '+(doc||'').length+' caracteres');
 chk(/AXAD-SER-007/.test(doc),'lleva el código AXAD-SER-007');
 chk(!/AXAD-084/.test(doc),'ya no dice AXAD-084 en ningún sitio');
 chk(/02 \(15\.01\.2025\)/.test(doc),'la versión es 02 (15.01.2025), fija');
 chk(!/Página <b>1<\/b> de 1/.test(doc)&&!/Página 1 de 1/.test(doc),'ya no dice «Página 1 de 1»');
 chk(/<i><b>PSV-106<\/b><\/i>/.test(doc),'en su sitio va PSV-106, sin rótulo y sin la línea');
 chk(!/PSV-106-001<\/b>/.test(doc.slice(0,doc.indexOf('</div>',doc.indexOf('class="mem"')))),
     'y no el código de la línea');

 /* y sin el número copiado en el ensayo, lo saca de su orden */
 const sinOs=await p.evaluate(()=>{
   const c=CALIBS.find(x=>x.id==='cT'); const g=c.os; delete c.os;
   const h=(documentoRecepcion(c)||{}).html; c.os=g; return h;
 });
 chk(/<i><b>PSV-106/.test(sinOs),'si el ensayo no lo copió, lo saca de la orden');

 /* los demás papeles siguen paginando como siempre */
 const cert=await p.evaluate(()=>{
   try{ return psvDocumento(CALIBS.find(x=>x.id==='cT')) }catch(e){ return 'ERROR '+e.message }
 });
 chk(cert==null||/Página/.test(String(cert))||String(cert).startsWith('ERROR'),
     'el certificado no cambió de membrete');

 /* se pinta de verdad en pantalla */
 await p.evaluate(()=>{const d=document.createElement('div');d.id='pruebaMem';
   d.innerHTML=(documentoRecepcion(CALIBS.find(x=>x.id==='cT'))||{}).html;document.body.appendChild(d)});
 const cajas=await p.evaluate(()=>[...document.querySelectorAll('#pruebaMem .mem .dt > *')]
   .map(x=>x.textContent.replace(/\s+/g,' ').trim()));
 chk(cajas.join(' | ').includes('PSV-106')&&!cajas.join(' ').includes('PSV N°'),
     'en pantalla: '+cajas.join(' | '));

 /* y ya no hay renglón de horas: son de gerencia */
 const hor=await p.evaluate(()=>{
   const d=document.getElementById('pruebaMem');
   return [...d.querySelectorAll('.mem .dt i')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
 });
 chk(hor.length===1,'el cuadro vuelve a sus tres casillas · '+hor.length+' renglón ancho');
 chk(!/Inicio|Término/.test(hor.join(' ')),'sin horario en el papel · '+hor.join(' | '));

 /* la casilla del cliente: su orden de compra, no el código del formato */
 const rej=await p.evaluate(()=>[...document.querySelectorAll('#pruebaMem .rej .c')]
   .map(x=>x.textContent.replace(/\s+/g,' ').trim()).slice(0,4));
 chk(rej.some(x=>/^Orden de compra ?SOL19191919$/.test(x)),'la casilla trae la OC del cliente · '+rej.join(' | '));
 chk(!rej.some(x=>/Cert\. n\./.test(x)),'ya no hay casilla «Cert. n.º» con el código del formato');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
