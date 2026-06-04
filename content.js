(() => {
  "use strict";

  const OVERLAY_ID = "__fullpeek_overlay__";
  let overlay, imgEl, infoEl;

  function build() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    imgEl = document.createElement("img");
    infoEl = document.createElement("div");
    infoEl.className = "__fp_info";
    overlay.append(imgEl, infoEl);
    document.documentElement.appendChild(overlay);
    overlay.addEventListener("click", hide);
  }

  function showOverlay() {
    build();
    overlay.style.display = "flex";
    requestAnimationFrame(() => overlay.classList.add("visible"));
  }

  function hide() {
    if (!overlay) return;
    overlay.classList.remove("visible");
    setTimeout(() => {
      overlay.style.display = "none";
      const s = imgEl.getAttribute("src") || "";
      if (s.startsWith("blob:")) URL.revokeObjectURL(s); // libera memoria
      imgEl.removeAttribute("src");
    }, 130);
  }

  // Decide que URL es la "imagen buena" a partir de lo que se ha clicado.
  // Prioridad: el enlace que envuelve la miniatura (suele ser la full-res),
  // y si no, el propio src de la imagen.
  function resolveUrl(target) {
    const a = target.closest && target.closest("a");
    if (a && a.href && !a.href.startsWith("javascript")) return a.href;
    if (target.tagName === "IMG") return target.currentSrc || target.src;
    return null;
  }

  // Camino 1: fetch desde la propia pagina (ideal si la imagen es del mismo dominio).
  async function viaPage(url) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  // Camino 2 (fallback): que la pida el background, que no sufre CORS.
  function viaBackground(url) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "FETCH_IMAGE", url }, (resp) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (resp && resp.ok) resolve(resp.dataUrl);
        else reject(new Error((resp && resp.error) || "fallo en background"));
      });
    });
  }

  async function peek(url) {
    console.log("[Imagen completa] pidiendo:", url); // diagnostico: mira aqui si algo falla
    showOverlay();
    infoEl.textContent = "cargando imagen completa…";
    imgEl.removeAttribute("src");

    let src;
    try {
      src = await viaPage(url);
    } catch (e1) {
      try {
        src = await viaBackground(url);
      } catch (e2) {
        infoEl.textContent = "no se pudo cargar: " + (e2.message || e1.message);
        return;
      }
    }

    imgEl.onload = () => {
      infoEl.textContent = imgEl.naturalWidth + " × " + imgEl.naturalHeight +
        " px  ·  clic o Esc para cerrar";
    };
    imgEl.onerror = () => { infoEl.textContent = "los bytes no son una imagen valida"; };
    imgEl.src = src;
  }

  // Ctrl+clic (o Cmd+clic en Mac). Capturamos antes que la pagina y cancelamos
  // su comportamiento (la descarga / abrir pestana).
  document.addEventListener("click", (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    const url = resolveUrl(e.target);
    if (!url) return;
    e.preventDefault();
    e.stopPropagation();
    peek(url);
  }, true);

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
})();
