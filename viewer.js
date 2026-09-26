// Corre en el origen de la extension, no en el de la pagina: la pagina no puede
// leer nada de aqui dentro. Con host_permissions tampoco le afecta CORS.
(async () => {
  "use strict";

  const MAX_BYTES = 100 * 1024 * 1024;
  // Imagenes, y octet-stream porque muchas webs que fuerzan la descarga sirven
  // la imagen asi. Lo demas (html, json...) se rechaza.
  const OK_TYPE = /^(image\/|application\/octet-stream|binary\/octet-stream)/i;

  const img = document.getElementById("img");
  const info = document.getElementById("info");

  const close = () => parent.postMessage("ctrlpeek:close", "*");
  document.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  let url = null;
  try { url = new URL(decodeURIComponent(location.hash.slice(1))); } catch {}
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
    info.textContent = "URL no valida";
    return;
  }

  // Lee el cuerpo por trozos y corta si pasa del limite, para no reventar la memoria.
  async function readLimited(res, type) {
    const reader = res.body.getReader();
    const parts = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) {
        reader.cancel();
        throw new Error("imagen demasiado grande (>100 MB)");
      }
      parts.push(value);
    }
    return new Blob(parts, { type: type.startsWith("image/") ? type : "" });
  }

  let src;
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (type && !OK_TYPE.test(type)) throw new Error("no es una imagen (" + type + ")");
    if (Number(res.headers.get("content-length")) > MAX_BYTES) {
      throw new Error("imagen demasiado grande (>100 MB)");
    }
    // El blob: URL muere con este documento al cerrar el visor (se quita el iframe).
    src = URL.createObjectURL(await readLimited(res, type));
  } catch (err) {
    info.textContent = "no se pudo cargar: " + (err.message || err);
    return;
  }

  img.onload = () => {
    info.textContent = img.naturalWidth + " × " + img.naturalHeight +
      " px  ·  clic o Esc para cerrar";
  };
  img.onerror = () => { info.textContent = "los bytes no son una imagen valida"; };
  img.src = src;
})();
