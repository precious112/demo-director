/*
 * The stage shell runtime.
 *
 * Contract with the render engine (mode: "film"):
 *   window.__stage.set(state)   called once per rendered frame with
 *                               { camera, cursor, caption, card, ...custom }
 *   window.__ready === true     set once the world is mounted and fonts are in
 *   window.DURATION             optional; only timeline stages set it
 *
 * A world is a plain HTML fragment (world.html) placed inside #world. It lays
 * out in world pixels. The camera transform is applied here, so the world never
 * needs to know the frame size or the zoom.
 */
(() => {
  const params = new URLSearchParams(location.search)
  const format = params.get("format") || "phone"
  document.documentElement.dataset.format = format

  const FORMATS = {
    wide: { w: 1920, h: 1080 },
    vertical: { w: 1080, h: 1920 },
    phone: { w: 1080, h: 1350 },
    square: { w: 1080, h: 1080 },
  }
  const F = FORMATS[format] || FORMATS.phone
  document.documentElement.style.width = F.w + "px"
  document.documentElement.style.height = F.h + "px"
  document.body.style.width = F.w + "px"
  document.body.style.height = F.h + "px"

  const stage = document.getElementById("stage")
  const world = document.getElementById("world")
  const captionEl = document.getElementById("caption")
  const cardEl = document.getElementById("card")
  const cursorEl = document.getElementById("cursor")

  const state = {
    camera: { cx: F.w / 2, cy: F.h / 2, w: F.w },
    cursor: { x: F.w / 2, y: F.h / 2, kind: "arrow", visible: true, down: false },
    caption: { text: "", opacity: 0 },
    card: { kind: "none", opacity: 0, title: "", sub: "", mono: "" },
  }

  // A cursor is a native-size system pointer, not a graphic scaled to the zoom.
  const CURSORS = {
    arrow: "<svg width='20' height='28' viewBox='0 0 24 34'><path d='M2 2v26.6l6.4-6.2 4.1 9.5 4.2-1.8-4-9.3h9Z' fill='#12141a' stroke='#fff' stroke-width='1.7' stroke-linejoin='round'/></svg>",
    pointer: "<svg width='22' height='26' viewBox='0 0 22 26'><path d='M6 12V4.2a2 2 0 1 1 4 0V11h.6V2.6a2 2 0 1 1 4 0V11h.6V4.4a2 2 0 1 1 4 0V15c0 5.4-3.4 9-8.6 9C6.6 24 4 20.7 4 16v-1.6a2 2 0 0 1 4 0V12Z' fill='#12141a' stroke='#fff' stroke-width='1.7' stroke-linejoin='round'/></svg>",
    ibeam: "<svg width='16' height='28' viewBox='0 0 16 28'><path d='M4 2h8M8 2v24M4 26h8' fill='none' stroke='#12141a' stroke-width='3.4' stroke-linecap='round'/><path d='M4 2h8M8 2v24M4 26h8' fill='none' stroke='#fff' stroke-width='1.6' stroke-linecap='round'/></svg>",
  }
  let cursorKind = ""
  const cursorScale = F.w / 1080

  function applyCamera(camera) {
    const s = F.w / camera.w
    const tx = F.w / 2 - camera.cx * s
    const ty = F.h / 2 - camera.cy * s
    world.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`
  }

  function applyCursor(cursor) {
    const s = F.w / state.camera.w
    const vx = (cursor.x - state.camera.cx) * s + F.w / 2
    const vy = (cursor.y - state.camera.cy) * s + F.h / 2
    if (cursor.kind !== cursorKind) {
      cursorKind = cursor.kind
      cursorEl.innerHTML = CURSORS[cursor.kind] || CURSORS.arrow
      const svg = cursorEl.firstElementChild
      if (svg) {
        svg.style.width = `${parseFloat(svg.getAttribute("width")) * cursorScale * (cursor.kind === "ibeam" ? 1.1 : 1)}px`
        svg.style.height = "auto"
      }
    }
    cursorEl.style.transform = `translate(${vx}px, ${vy}px)`
    cursorEl.dataset.visible = cursor.visible === false ? "0" : "1"
    cursorEl.dataset.down = cursor.down ? "1" : "0"
  }

  function apply(camera, cursor, caption, card) {
    applyCamera(camera)
    applyCursor(cursor)
    if (caption.text !== undefined) captionEl.textContent = caption.text || ""
    captionEl.style.opacity = caption.opacity ?? 0
    if (caption.scrim !== undefined) captionEl.dataset.scrim = caption.scrim ? "1" : "0"
    if (card.kind !== undefined) cardEl.dataset.kind = card.kind || "none"
    if (card.title !== undefined || card.text !== undefined) cardEl.innerHTML = renderCard(card)
    cardEl.style.opacity = card.opacity ?? 0
    document.documentElement.dataset.cursor = cursor.kind
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))
  }
  function renderCard(card) {
    const title = card.title ?? card.text ?? ""
    return `<div class="title">${esc(title)}</div>${card.sub ? `<div class="sub">${esc(card.sub)}</div>` : ""}${card.mono ? `<div class="mono">${esc(card.mono)}</div>` : ""}`
  }

  window.__stage = {
    state,
    set(patch) {
      if (typeof patch === "function") patch = patch(state)
      Object.assign(state, patch)
      apply(state.camera, state.cursor, state.caption, state.card)
    },
  }

  // Mount the world, then signal readiness once styles, world.js and fonts are in.
  function loadWorldJs() {
    return new Promise((resolve) => {
      const existing = document.querySelector('script[data-world-js]')
      if (existing) return resolve()
      const s = document.createElement("script")
      s.type = "module"
      s.src = "world.js"
      s.dataset.worldJs = "1"
      s.onload = () => resolve()
      s.onerror = () => resolve() // a world without behaviour is fine
      document.body.appendChild(s)
    })
  }

  fetch("world.html")
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`world.html: ${r.status}`))))
    .then((html) => {
      world.innerHTML = html
      const style = document.createElement("link")
      style.rel = "stylesheet"
      style.href = "world.css"
      style.onload = style.onerror = async () => {
        await loadWorldJs()
        const fonts = document.fonts ? document.fonts.ready : Promise.resolve()
        await fonts
        // A world may announce its own readiness (e.g. a scripted backend).
        if (typeof window.__worldReady === "function") {
          await Promise.resolve(window.__worldReady())
        }
        window.__ready = true
      }
      document.head.appendChild(style)
    })
    .catch((err) => {
      console.error(err)
      window.__ready = true
    })
})()
