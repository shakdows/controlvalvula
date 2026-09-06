/* El informe del portal, al lado del DVAD-SER-002 de la casa.
   Lo que se comprueba es lo que se lee en el papel de verdad:
     · versión «1 (15.07.2024)», la del formato, no la de hoy
     · la nota del SIG al pie de TODAS las hojas
     · la carátula: «Mantenimiento y calibración…» y el SIG debajo
     · doce apartados, y el 11 es recomendaciones y el 12 conclusiones
     · el registro: un bloque numerado por pieza, y la cuenta sigue */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ok=[],mal=[]; const chk=(c,t)=>(c?ok:mal).push(t);
const PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
const limpio=h=>String(h).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1400,height:1000}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>abrirSesion(CUENTAS.find(x=>x.perfil==='admin'),false));
 await p.waitForTimeout(600);
 await p.evaluate(px=>{
   const hoy=HOY.toISOString().slice(0,10);
   CLIENTES.push({id:'cliT',n:'SAPE',firmantes:[
     {rol:'ejec',n:'Junior Torres',cargo:'Asesor Técnico'},
     {rol:'vbInsp',n:'Pedro Quispe',cargo:'Inspector'},
     {rol:'vbResp',n:'Marta Salas',cargo:'Gestor de contrato'}]});
   ACTIVOS.push({id:'aT',cli:'cliT',tag:'PSV-108',ser:'C1',medida:'4" x 6"',mod:Object.keys(MODELOS)[0]});
   ORDENES.push({id:'oT',act:'aT',mat:'PSV-108',n:'PSV-108',num:108,et:'mant',f:hoy,oc:'450006785',
     ing:'Jose Rojas',pasos:['ent','mant','cert'],hist:{ent:hoy,mant:hoy},calib:'cT'});
   CALIBS.push({id:'cT',act:'aT',ord:'oT',tipo:'psv',os:'PSV-108-001',und:'psi',set:150,setEsp:150,
     asFound:'152',fecha:hoy,rcFecha:hoy,rcVeredicto:'acepta',rcRecibe:'Jose Rojas',
     patDesc:'Banco de pruebas',patMarca:'BARBEE',patModelo:'TP-RVAS',patSerie:'P',patCert:'C',
     pares:[{a:px,d:px,nota:'Tobera',accion:'Se realizó recuperación por lapeo'},
            {a:px,d:px,nota:'Disco',envAr:true,envArTs:hoy+' 08:00',regAr:true,regArTs:hoy+' 15:00'}],
     tests:[{v:150,pc:'2',fotos:[px]}],
     firmas:[{rol:'recep',n:'Jose Rojas',f:hoy,h:'08:30',img:px}]});
   renderAll();
 },PX);

 const h=await p.evaluate(()=>{const d=documentoInforme('oT',['oT']);
   return String((d&&(d.html||d))||'')});
 const txt=limpio(h);

 /* 1 · la versión del formato */
 chk(h.includes('1 (15.07.2024)'),'la versión es la del formato · 1 (15.07.2024)');
 chk(!/Versión[\s\S]{0,80}20(2[6-9]|3\d)/.test(txt.slice(0,600)),'y no la fecha de hoy');

 /* 2 · la nota del SIG al pie de todas las hojas */
 const hojas=(h.match(/<section class="hoja/g)||[]).length;
 const sigs=(h.match(/responsable del SIG/g)||[]).length;
 chk(hojas>=4,'el informe tiene sus hojas · '+hojas);
 chk(sigs>=hojas,`la nota del SIG está en todas · ${sigs} notas para ${hojas} hojas`);

 /* 3 · la carátula */
 chk(/Mantenimiento y calibración de válvulas de seguridad/.test(h),
     'la carátula lleva el título del formato');
 chk(!/cara-pie">/.test(h),'y sin pie propio: el SIG lo pone el pie de la hoja, una sola vez');
 /* El número de la válvula va limpio en su casilla: la raya del cuadro
    es del cuadro, no de la palabra. */
 chk(!/\.mem \.dt b:nth-last-of-type/.test(h),'el número de la válvula no sale subrayado');
 chk(/\.mem \.dt>b:nth-last-of-type/.test(h),'la raya se le pide sólo a las casillas del cuadro');

 /* 4 · los doce apartados, en el orden del formato */
 const aps=[...h.matchAll(/<h2(?![^>]*class="sn")[^>]*>([^<]+)<\/h2>/g)].map(m=>m[1].trim());
 const esperados=['Antecedentes','Alcance','Referencias normativas','Personal asignado',
   'Seguridad, salud y medio ambiente',
   'Actividades de mantenimiento, calibración y pruebas de la válvula',
   'Herramientas utilizadas','Equipos utilizados',
   'Cuadro resumen de pruebas de calibración de las válvulas',
   'Problemas y acciones correctivas','Recomendaciones generales','Conclusiones'];
 chk(aps.length===12,'son doce apartados · '+aps.length+' · '+aps.join(' | '));
 esperados.forEach((e,i)=>chk(aps[i]===e,`${i+1}. ${e}`+(aps[i]===e?'':` · salió «${aps[i]}»`)));
 chk(h.indexOf('<h2>Recomendaciones generales</h2>')<h.indexOf('<h2>Conclusiones</h2>'),
     'las recomendaciones van ANTES que las conclusiones, como en el papel');

 /* 4bis · «Atención» es la persona del cliente, no el técnico de la casa */
 const at=(h.match(/<span>Atención<\/span><i>:<\/i><b>([\s\S]{0,80}?)<\/b>/)||[])[1]||'';
 chk(/Marta Salas/.test(at),'«Atención» es el contacto del cliente · '+at.replace(/<[^>]+>/g,''));
 chk(!/Jose Rojas/.test(at),'y no el técnico de la casa que hizo el trabajo');

 /* 4ter · la columna del TAG, y ni una raya para rellenar a mano */
 chk(/<th>TAG<\/th>/.test(h),'el detalle lleva la columna TAG');
 chk(!/<td>Calibración de válvulas<\/td>/.test(h),'y no la descripción repetida en cada fila');
 chk(/<td>PSV-108<\/td>/.test(h),'con el TAG de planta de la válvula');
 chk(!/class="ln"/.test(h),'no queda ni una raya para rellenar a mano');
 /* La norma se nombra entera: ASME B16.34, no B16.34 a secas. */
 chk(/Norma ASME B16\.34/.test(txt),'la norma se nombra entera · ASME B16.34');

 /* 4quater · el patrón se nombra, sin serie ni certificado */
 const eq=(h.match(/<h2>Equipos utilizados<\/h2>[\s\S]{0,400}?<\/p>/)||[''])[0];
 chk(/Patrón: Banco de pruebas BARBEE TP-RVAS\./.test(eq),'el patrón se nombra · '+limpio(eq).slice(0,110));
 chk(!/serie/.test(eq)&&!/certificado/.test(eq),'sin la serie ni el número de certificado');

 /* 5 · el registro: un bloque por pieza, numerado y sin repetir */
 const bloques=[...h.matchAll(/<td class="n" rowspan="2">(\d+)<\/td>/g)].map(m=>+m[1]);
 chk(bloques.length>=3,'un bloque por pieza y otro por los disparos · '+bloques.length);
 chk(bloques.every((v,i)=>v===i+1),'y la cuenta corre seguida · '+bloques.join(','));
 chk(/<th>Tobera<\/th>/.test(h),'cada pieza con su nombre de rótulo · Tobera');
 chk(/<th>Disco<\/th>/.test(h),'y la siguiente con el suyo · Disco');
 chk(/recuperación por lapeo/.test(txt),'y lo que se le hizo, en su renglón');
 chk(/volvió de arenado/.test(txt),'lo que salió de casa se dice en el papel');
 chk(!/Desarme · antes y después/.test(txt),'ya no va todo en un solo bloque sin numerar');
 chk(!/colspan="3" class="fot"/.test(h),'las fotos van al lado del número, no debajo');

 console.log(ok.map(t=>'  ✓ '+t).join('\n'));
 if(mal.length)console.log(mal.map(t=>'  ✗ '+t).join('\n'));
 console.log('errores JS:',errs.length?errs.join(' | '):'ninguno');
 console.log(mal.length?'FALLA':'TODO BIEN');
 await b.close(); process.exit(mal.length?1:0);
})();
