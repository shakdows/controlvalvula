// ============================================================
//  Consulta de RUC · función Edge de Supabase
//
//  POR QUÉ HACE FALTA ESTO
//  SUNAT no publica una consulta que una página web pueda llamar:
//  la suya es un formulario con sesión, pensado para personas. Y las
//  APIs de terceros que sí devuelven JSON tienen dos problemas para
//  llamarlas desde el navegador:
//    · el navegador las bloquea (no envían cabeceras CORS), y
//    · piden una clave que, puesta en el index.html, la vería
//      cualquiera que abra el código fuente de la página.
//  Esta función resuelve las dos cosas: se ejecuta en el servidor,
//  guarda la clave donde nadie la ve, y contesta al navegador con
//  permiso para leerla.
//
//  CÓMO SE MONTA (5 minutos, una sola vez)
//   1. Consigue una clave gratuita en https://apis.net.pe
//      (registro con correo; el plan gratis da unas 1000 consultas
//      al mes, de sobra para dar de alta clientes).
//   2. Entra a tu proyecto en supabase.com
//      → Edge Functions → Deploy a new function
//      → nombre: ruc
//      → pega este archivo entero y despliega.
//   3. En Edge Functions → ruc → Settings → Secrets, añade:
//         APIS_TOKEN = la clave del paso 1
//   4. Copia la dirección que te da Supabase, algo como
//         https://TU-PROYECTO.supabase.co/functions/v1/ruc
//      y pégala en el portal: Ajustes → Organización → Consulta de RUC.
//      Pulsa «Probar la conexión» y luego «Guardar».
//
//  Si algún día cambias de proveedor, sólo se toca este archivo: el
//  portal sigue llamando igual.
// ============================================================

const CORS = {
  // El portal se sirve desde Vercel; si mañana cambia el dominio,
  // cámbialo aquí o déjalo en "*" mientras se prueba.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** El dígito verificador del RUC. Comprobarlo aquí evita gastar una
 *  consulta del plan en un número mal escrito. */
function rucValido(r: string): boolean {
  if (!/^\d{11}$/.test(r)) return false;
  const peso = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) suma += Number(r[i]) * peso[i];
  const resto = 11 - (suma % 11);
  const dv = resto === 10 ? 0 : resto === 11 ? 1 : resto;
  return dv === Number(r[10]);
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });

Deno.serve(async (req: Request) => {
  // El navegador pregunta primero si puede llamar. Hay que contestar.
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const ruc = (new URL(req.url).searchParams.get("ruc") || "").replace(/\D/g, "");

  if (!ruc) return json({ error: "Falta el parámetro ruc" }, 400);
  if (!rucValido(ruc)) {
    return json({ error: "RUC inválido: el dígito verificador no cuadra" }, 400);
  }

  const token = Deno.env.get("APIS_TOKEN");
  if (!token) {
    return json(
      { error: "El servicio no tiene configurada la clave APIS_TOKEN" },
      500,
    );
  }

  // Las direcciones que se prueban, en orden. El proveedor ha
  // cambiado de versión más de una vez; en vez de dejar una sola
  // escrita a fuego, se intentan las conocidas y se usa la primera
  // que conteste. Si algún día ninguna sirve, se pone la nueva en el
  // secreto RUC_URL —con {ruc} donde va el número— y no hay que
  // volver a desplegar nada.
  const propia = Deno.env.get("RUC_URL");
  const intentos = propia
    ? [propia.replace("{ruc}", ruc)]
    : [
      `https://api.apis.net.pe/v2/sunat/ruc?numero=${ruc}`,
      `https://api.apis.net.pe/v1/ruc?numero=${ruc}`,
    ];

  let ultimo = "";
  for (const url of intentos) {
    try {
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          Referer: "https://controlvalvula.vercel.app",
        },
      });

      // Estos tres no son culpa de la dirección: no tiene sentido
      // seguir probando, y hay que decir exactamente qué pasó.
      if (r.status === 401 || r.status === 403) {
        return json({
          error: "La clave del proveedor fue rechazada. Revisa el secreto APIS_TOKEN.",
        }, 502);
      }
      if (r.status === 429) {
        return json({
          error: "Se agotaron las consultas del plan en el proveedor.",
        }, 429);
      }
      // 422 y 404 dicen cosas distintas y hay que contarlas distinto:
      // uno es "el número está mal escrito", el otro es "el número
      // está bien pero no existe". Confundirlos manda al usuario a
      // buscar el error donde no está.
      if (r.status === 422) {
        let msg = "El RUC no pasa la validación de SUNAT";
        try { const e = await r.json(); if (e && e.error) msg = e.error; } catch { /* sin cuerpo */ }
        return json({ error: msg }, 400);
      }
      if (r.status === 404) {
        return json({ error: "Ese RUC no figura en el padrón de SUNAT" }, 404);
      }

      if (!r.ok) { ultimo = `${url.split("?")[0]} → ${r.status}`; continue; }

      const d = await r.json();

      // Cada versión llama distinto a lo mismo. Se aceptan todos los
      // nombres que se han visto y se devuelve siempre igual, para
      // que el portal no tenga que enterarse de qué hay detrás.
      const razon = d.razonSocial ?? d.nombre ?? d.nombre_o_razon_social ?? "";
      if (!razon) { ultimo = `${url.split("?")[0]} → contestó sin razón social`; continue; }

      // El padrón trae la dirección troceada y también armada. Se usa
      // la armada y se le pegan distrito, provincia y departamento,
      // que vienen aparte y son justo lo que falta para que la
      // dirección sirva de algo. El guion suelto "-" es como el
      // padrón dice "vacío": no debe salir impreso.
      const limpio = (v: unknown) => {
        const s = String(v ?? "").trim();
        return s && s !== "-" ? s : "";
      };
      const zona = [d.distrito, d.provincia, d.departamento]
        .map(limpio).filter(Boolean);
      // Lima aparece como distrito, provincia y departamento a la vez:
      // repetirlo tres veces no informa de nada.
      const zonaUnica = [...new Set(zona)];

      return json({
        ruc,
        razonSocial: razon,
        direccion: [limpio(d.direccion), zonaUnica.join(", ")]
          .filter(Boolean).join(" — "),
        estado: limpio(d.estado) || limpio(d.estado_del_contribuyente),
        condicion: limpio(d.condicion) || limpio(d.condicion_de_domicilio),
        // Estos sólo vienen en la respuesta extendida. Si no están, se
        // devuelven vacíos y el portal simplemente no los usa.
        tipo: limpio(d.tipo),
        actividadEconomica: limpio(d.actividadEconomica),
        distrito: limpio(d.distrito),
        provincia: limpio(d.provincia),
        departamento: limpio(d.departamento),
        consultadoEl: new Date().toISOString(),
      });
    } catch (e) {
      ultimo = `${url.split("?")[0]} → ${(e as Error).message}`;
    }
  }

  // Se dice qué se intentó y con qué resultado: sin esto, depurar
  // desde el otro lado es adivinar.
  return json({
    error: "Ninguna dirección del proveedor respondió. Último intento: " +
      (ultimo || "sin detalle") +
      ". Si el proveedor cambió de dirección, ponla en el secreto RUC_URL usando {ruc} donde va el número.",
  }, 502);
});
