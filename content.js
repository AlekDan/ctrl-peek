(() => {
  "use strict";

  const OVERLAY_ID = "__fullpeek_overlay__";
  const VIEWER_URL = chrome.runtime.getURL("viewer.html");
  let overlay, frame, hideTimer;

  function build() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    document.documentElement.appendChild(overlay);
  }

  // La imagen se pide y se pinta dentro de un iframe de la extension (otro
  // origen), no en el DOM de la pagina: asi la pagina no puede leer los bytes
  // aunque el enlace clicado lo haya puesto ella.
  function show(url) {
    build();
    clearTimeout(hideTimer);
    frame = document.createElement("iframe");
    frame.src = VIEWER_URL + "#" + encodeURIComponent(url);
    frame.addEventListener("load", () => frame && frame.focus()); // para que Esc funcione dentro
    overlay.replaceChildren(frame);
    overlay.style.display = "block";
    requestAnimationFrame(() => overlay.classList.add("visible"));
  }

  function hide() {
    if (!overlay || !frame) return;
    overlay.classList.remove("visible");
    frame = null;
    hideTimer = setTimeout(() => {
      overlay.style.display = "none";
      overlay.replaceChildren(); // quitar el iframe libera la imagen de memoria
    }, 130);
  }

  // Solo http(s): nada de javascript:, data:, file:, chrome-extension:...
  function httpUrl(u) {
    if (typeof u !== "string" || !u) return null;
    try {
      const p = new URL(u, location.href);
      return p.protocol === "http:" || p.protocol === "https:" ? p.href : null;
    } catch {
      return null;
    }
  }

  // Decide que URL es la "imagen buena" a partir de lo que se ha clicado.
  // Prioridad: el enlace que envuelve la miniatura (suele ser la full-res),
  // y si no, el propio src de la imagen.
  function resolveUrl(target) {
    const a = target.closest && target.closest("a");
    const fromLink = a && httpUrl(a.href);
    if (fromLink) return fromLink;
    if (target.tagName === "IMG") return httpUrl(target.currentSrc || target.src);
    return null;
  }

  // Ctrl+clic (o Cmd+clic en Mac). Capturamos antes que la pagina y cancelamos
  // su comportamiento (la descarga / abrir pestana).
  document.addEventListener("click", (e) => {
    if (!e.isTrusted) return; // ignora clics simulados por la propia pagina
    if (!e.ctrlKey && !e.metaKey) return;
    const url = resolveUrl(e.target);
    if (!url) return;
    e.preventDefault();
    e.stopPropagation();
    console.log("[Imagen completa] pidiendo:", url); // diagnostico: mira aqui si algo falla
    show(url);
  }, true);

  // El visor pide cerrarse (clic o Esc dentro del iframe). Solo se acepta si
  // el mensaje viene de nuestro iframe, no de la pagina.
  window.addEventListener("message", (e) => {
    if (frame && e.source === frame.contentWindow && e.data === "ctrlpeek:close") hide();
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
})();
