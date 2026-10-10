// witch-fuse.js : Witch Fuse Machine (machine sur la map, popup "E", vidéo de transition, dimension de fusion)
// Script classique : à charger après le script du jeu (même dossier que index.html).
(function () {
  const MACHINE_IMG = "Witch%20Fuze%20Machine.png";
  const VIDEO_SRC = "Transition%20Witch%20Fuse.mp4";
  const TITLE = "Witch Fuse Machine";
  const LETTER_COLORS = ["#4f1c79", "#5f2687"];

  const $ = id => document.getElementById(id);
  const T = s => (window.T ? window.T(s) : s);
  const acc = () => accounts[currentAccountName];
  const active = () => typeof gameActive !== "undefined" && gameActive && currentGameMode === "adventure";

  /* ---------- styles ---------- */
  const css = document.createElement("style");
  css.textContent = `
  #wf-map{position:fixed;right:24px;top:50%;transform:translateY(-50%);height:clamp(120px,24vh,240px);width:auto;z-index:-1;pointer-events:none;display:none;transition:filter .2s,transform .2s}
  #wf-map.hot{filter:drop-shadow(0 0 14px #b47cff) drop-shadow(0 0 4px #fff);transform:translateY(-50%) scale(1.04)}
  #wf-prompt{position:fixed;z-index:30;pointer-events:none;display:none;align-items:center;gap:10px;padding:8px 12px 8px 8px;background:rgba(20,20,25,.85);border:2px solid rgba(255,255,255,.35);border-radius:12px;color:#fff;font-size:9px;line-height:1.4;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.45)}
  #wf-prompt .wf-key{width:28px;height:28px;border-radius:8px;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px;background:rgba(255,255,255,.12)}
  #wf-video{position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;background:#000;z-index:9500;display:none;transition:opacity .45s}
  #wf-dim{position:fixed;inset:0;z-index:9400;display:none;overflow:hidden;color:#fff;background:radial-gradient(circle at 50% 36%,#b9a3d9 0%,#6b4a96 26%,#2a1646 55%,#0d0618 100%)}
  #wf-strip{position:absolute;top:0;left:0;right:0;height:78px;overflow:hidden;background:rgba(10,4,20,.65);border-bottom:2px solid rgba(255,255,255,.2);display:flex;align-items:center}
  #wf-track{display:flex;width:max-content;animation:wf-scroll var(--wf-d,20s) linear infinite}
  .wf-grp{display:flex;gap:14px;padding-right:14px}
  .wf-card{display:flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.2);border-radius:12px;font-size:12px;white-space:nowrap}
  .wf-card img{width:40px;height:40px;object-fit:contain}
  .wf-empty{width:100%;text-align:center;font-size:11px;color:#cbbbe6;padding:0 10px}
  @keyframes wf-scroll{to{transform:translateX(-50%)}}
  #wf-title{position:absolute;left:0;right:0;bottom:calc(50vh + 26px);text-align:center;white-space:pre-wrap;font-family:'Press Start 2P',cursive;font-size:clamp(16px,3.6vw,44px);line-height:1.4;opacity:0;-webkit-text-stroke:3px #f4ecff;paint-order:stroke fill;text-shadow:0 4px 0 rgba(0,0,0,.35)}
  #wf-machine{position:absolute;left:50%;bottom:0;height:50vh;max-width:90vw;object-fit:contain;object-position:bottom;transform:translate(-50%,105%)}
  #wf-dim.go #wf-machine{animation:wf-rise 1.6s cubic-bezier(.2,.8,.25,1) forwards}
  #wf-dim.go #wf-title{animation:wf-fade .7s ease-out 1.1s forwards}
  @keyframes wf-rise{from{transform:translate(-50%,105%)}to{transform:translate(-50%,0)}}
  @keyframes wf-fade{from{opacity:0}to{opacity:1}}
  #wf-exit{position:absolute;left:20px;bottom:20px;border:0;border-radius:10px;padding:12px 18px;background:#c23616;color:#fff;font-size:10px;cursor:pointer}
  #wf-exit:hover{background:#ea2027}
  @media (prefers-reduced-motion:reduce){#wf-track{animation-duration:calc(var(--wf-d,20s)*3)}}`;
  document.head.appendChild(css);

  /* ---------- éléments ---------- */
  const map = new Image(); map.id = "wf-map"; map.src = MACHINE_IMG; map.alt = ""; map.onerror = () => { map.style.visibility = "hidden"; };
  document.body.appendChild(map);

  const prompt = document.createElement("div"); prompt.id = "wf-prompt";
  prompt.innerHTML = '<div class="wf-key">E</div><div>Enter the fuse machine</div>';
  document.body.appendChild(prompt);

  const vid = document.createElement("video"); vid.id = "wf-video"; vid.playsInline = true; vid.preload = "auto"; vid.src = VIDEO_SRC;
  document.body.appendChild(vid);

  const dim = document.createElement("div"); dim.id = "wf-dim";
  dim.innerHTML = `<div id="wf-strip"><div id="wf-track"></div></div><div id="wf-title"></div><img id="wf-machine" src="${MACHINE_IMG}" alt=""><button id="wf-exit">Close ✖</button>`;
  document.body.appendChild(dim);
  $("wf-machine").onerror = function () { this.style.display = "none"; };

  // titre : une lettre sur deux dans l'autre couleur (les espaces ne comptent pas)
  (function () {
    const t = $("wf-title"); let i = 0;
    for (const ch of TITLE) {
      const s = document.createElement("span"); s.textContent = ch;
      if (ch !== " ") s.style.color = LETTER_COLORS[i++ % 2];
      t.appendChild(s);
    }
  })();

  /* ---------- inventaire défilant ---------- */
  function listItems() {
    const a = acc(), out = []; if (!a) return out;
    APPLE_ORDER.forEach(t => { const n = a[APPLE_FIELDS[t]] || 0; if (n > 0) out.push({ img: IMG_FRUITS[t], n, name: APPLE_NAMES[t] }); });
    Object.entries(a.potions || {}).forEach(([id, n]) => {
      const p = SHOP_PRODUCTS.find(p => p.id === id);
      if (p && n > 0) out.push({ img: IMG_POTIONS[p.type], n, name: `Luck x${p.multiplier} (${p.duration}s)` });
    });
    return out;
  }
  let lastSig = "";
  function renderStrip(force) {
    const list = listItems(), sig = JSON.stringify(list.map(i => [i.name, i.n]));
    if (!force && sig === lastSig) return; lastSig = sig;
    const track = $("wf-track"); track.innerHTML = "";
    if (!list.length) {
      track.style.animation = "none"; track.style.width = "100%";
      const e = document.createElement("div"); e.className = "wf-empty"; e.textContent = "You have no apples"; track.appendChild(e); return;
    }
    track.style.animation = ""; track.style.width = "";
    const group = () => {
      const g = document.createElement("div"); g.className = "wf-grp";
      list.forEach(i => {
        const c = document.createElement("div"); c.className = "wf-card"; c.title = i.name;
        const im = new Image(); im.src = i.img; im.alt = i.name;
        const q = document.createElement("span"); q.textContent = "x" + fmtNum(i.n);
        c.append(im, q); g.appendChild(c);
      });
      return g;
    };
    const g0 = group(); track.appendChild(g0);
    requestAnimationFrame(() => {
      const w = g0.getBoundingClientRect().width || 1, reps = Math.max(1, Math.ceil(window.innerWidth / w));
      track.innerHTML = ""; for (let k = 0; k < reps * 2; k++) track.appendChild(group());
      track.style.setProperty("--wf-d", (w * reps / 70) + "s"); // ~70 px/s
    });
  }

  /* ---------- séquence : popup -> E -> vidéo -> dimension ---------- */
  let vidOpen = false, dimOpen = false, hover = false, promptOn = false, mx = -1, my = -1;

  function startVideo() {
    if (vidOpen || dimOpen) return;
    vidOpen = true; hideTip();
    vid.style.opacity = "1"; vid.style.display = "block"; vid.currentTime = 0;
    const p = vid.play(); if (p && p.catch) p.catch(() => enterDimension());
  }
  vid.addEventListener("ended", () => enterDimension());
  vid.addEventListener("error", () => { if (vidOpen) enterDimension(); });

  function enterDimension() {
    if (dimOpen || !vidOpen) return;
    vidOpen = false; dimOpen = true;
    dim.classList.remove("go"); dim.style.display = "block"; void dim.offsetWidth; dim.classList.add("go");
    renderStrip(true);
    vid.style.opacity = "0";
    setTimeout(() => { vid.pause(); vid.style.display = "none"; }, 480);
  }
  function closeAll() {
    if (vidOpen) { vid.pause(); vid.style.display = "none"; vidOpen = false; }
    if (dimOpen) { dim.style.display = "none"; dim.classList.remove("go"); dimOpen = false; }
  }
  $("wf-exit").onclick = closeAll;

  window.addEventListener("keydown", e => {
    if ((vidOpen || dimOpen) && e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeAll(); return; }
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== "e") return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).nodeName)) return;
    if (promptOn) { e.preventDefault(); startVideo(); }
  }, true);

  /* ---------- survol de la machine ---------- */
  const blocked = () => ["inventory-screen", "shop-screen", "index-screen", "trade-screen", "trading-screen", "profile-page", "sell-modal", "custom-confirm-modal", "autosell-modal", "add-modal", "account-modal"]
    .some(id => { const e = $(id); return e && getComputedStyle(e).display !== "none"; });

  function hideTip() { promptOn = false; prompt.style.display = "none"; map.classList.remove("hot"); }
  function refresh() {
    const on = active() && !vidOpen && !dimOpen;
    map.style.display = active() ? "block" : "none";
    if (!on) { if (promptOn) hideTip(); if (!active()) closeAll(); return; }
    const r = map.getBoundingClientRect(), pad = 6;
    hover = mx >= r.left - pad && mx <= r.right + pad && my >= r.top - pad && my <= r.bottom + pad;
    const show = hover && !blocked();
    map.classList.toggle("hot", show);
    if (show) {
      prompt.style.display = "flex"; promptOn = true;
      const w = prompt.offsetWidth, h = prompt.offsetHeight;
      prompt.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
      prompt.style.top = Math.max(8, r.top - h - 10) + "px";
    } else if (promptOn) hideTip();
  }
  window.addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; refresh(); });
  setInterval(() => { refresh(); if (dimOpen) renderStrip(false); }, 200);
})();
