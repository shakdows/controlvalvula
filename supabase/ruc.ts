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

  try {
    const r = await fetch(
      `https://api.apis.net.pe/v2/sunat/ruc?numero=${ruc}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          Referer: "https://controlvalvula.vercel.app",
        },
      },
    );

    if (r.status === 404) {
      return json({ error: "Ese RUC no figura en el padrón de SUNAT" }, 404);
    }
    if (r.status === 401 || r.status === 403) {
      return json({ error: "La clave del proveedor fue rechazada" }, 502);
    }
    if (r.status === 429) {
      return json(
        { error: "Se agotaron las consultas del mes en el proveedor" },
        429,
      );
    }
    if (!r.ok) {
      return json({ error: `El proveedor contestó ${r.status}` }, 502);
    }

    const d = await r.json();

    // Se devuelve siempre con los mismos nombres, pase lo que pase
    // arriba: el portal no tiene por qué enterarse de qué proveedor
    // hay detrás.
    return json({
      ruc,
      razonSocial: d.razonSocial ?? d.nombre ?? "",
      direccion: [d.direccion, d.distrito, d.provincia, d.departamento]
        .filter(Boolean)
        .join(" - "),
      estado: d.estado ?? "",
      condicion: d.condicion ?? "",
      consultadoEl: new Date().toISOString(),
    });
  } catch (e) {
    return json(
      { error: "No se pudo consultar: " + (e as Error).message },
      502,
    );
  }
});
