// Hace el fetch desde el contexto de la extension (con host_permissions
// no le afecta CORS) y devuelve la imagen como data URL en base64.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "FETCH_IMAGE") {
    fetch(msg.url, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        const buf = await res.arrayBuffer();
        const mime = res.headers.get("content-type") || "image/jpeg";
        sendResponse({ ok: true, dataUrl: "data:" + mime + ";base64," + toBase64(buf) });
      })
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true; // mantiene el canal abierto para la respuesta asincrona
  }
});

// base64 por trozos para no reventar la pila con imagenes grandes
function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
