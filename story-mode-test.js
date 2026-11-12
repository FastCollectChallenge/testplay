(function () {
  /* ---------- chemins (à corriger ici si besoin) ---------- */
  const P = {
    station: "story-mode/cutscenes/Welcome/Train Station.png",
    music:   "story-mode/soundtrack/Main theme.png",   // probablement .mp3 ?
    amilia:  "story-mode/cutscenes/Welcome/Almila.png"
  };
  const url = p => encodeURI(p);
  const tr = s => (window.T ? window.T(s) : s);        // traduction (i18n.js)
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const S = { on: false, run: 0, music: null, onNext: null, timer: null };

  /* ---------- scène : Welcome ---------- */
  const WELCOME = [
    { who: "???",    text: "Hi! Welcome to Orchard City" },
    { who: "???",    text: "My name is Amilia and I'm here to greet you" },
    { who: "Amilia", text: "Welcome to Orchard City", face: P.amilia },
    { who: "Amilia", text: "First of all, let me teach you how to use your joystick", face: P.amilia }
  ];

  /* ---------- style (même thème que l'écran d'accueil) ---------- */
  const css = document.createElement("style");
  css.textContent = `
  #story-ov{position:fixed;inset:0;z-index:15;background:#000;overflow:hidden}
  #story-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 2s ease,filter 1s ease}
  #story-bg.in{opacity:1}
  #story-bg.dark{filter:brightness(.35)}
  #story-dlg{position:absolute;left:4vw;bottom:5vh;width:min(900px,92vw);display:none;align-items:flex-end;gap:16px;animation:trpop .22s ease-out}
  #story-face{width:130px;height:130px;object-fit:contain;flex:none;display:none;filter:drop-shadow(0 8px 18px rgba(0,0,0,.6))}
  #story-box{position:relative;flex:1;min-height:120px;box-sizing:border-box;padding:26px 28px 22px;border-radius:20px;background:rgba(10,13,20,.80);border:1px solid rgba(255,255,255,.10);backdrop-filter:blur(24px) saturate(140%);box-shadow:0 30px 80px rgba(0,0,0,.6);color:#e8ecf4}
  #story-name{position:absolute;top:-16px;left:22px;padding:5px 16px;border-radius:999px;font-size:13px;font-weight:800;letter-spacing:-.02em;color:#fff;background:linear-gradient(135deg,#7c5cff,#22d3ee);box-shadow:0 6px 20px rgba(124,92,255,.4)}
  #story-text{font-size:18px;font-weight:600;line-height:1.6;min-height:58px}
  #story-next{position:absolute;right:18px;bottom:10px;font-size:12px;color:#a5b4fc;opacity:0;animation:storyblink 1s infinite}
  #story-next.show{opacity:1}
  @keyframes storyblink{50%{transform:translateY(3px);opacity:.4}}`;
  document.head.appendChild(css);

  /* ---------- éléments ---------- */
  function build() {
    const ov = document.createElement("div"); ov.id = "story-ov";
    ov.innerHTML = `<img id="story-bg" alt="">
      <div id="story-dlg"><img id="story-face" alt="">
        <div id="story-box"><div id="story-name"></div><div id="story-text"></div><div id="story-next">▼</div></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener("mousedown", () => S.onNext && S.onNext());
    return ov;
  }
  const $ = id => document.getElementById(id);
  document.addEventListener("keydown", e => {
    if (S.on && S.onNext && (e.code === "Space" || e.code === "Enter")) { e.preventDefault(); S.onNext(); }
  });

  /* ---------- pop-up de parole (machine à écrire) ---------- */
  function say(line) {
    return new Promise(res => {
      $("story-dlg").style.display = "flex";
      $("story-name").textContent = line.who;                 // les noms ne sont jamais traduits
      const face = $("story-face");
      if (line.face) { face.src = url(line.face); face.style.display = "block"; } else face.style.display = "none";
      const full = tr(line.text), txt = $("story-text"), nx = $("story-next");
      txt.textContent = ""; nx.classList.remove("show");
      let i = 0, typing = true;
      clearInterval(S.timer);
      const finish = () => { clearInterval(S.timer); txt.textContent = full; typing = false; nx.classList.add("show"); };
      S.timer = setInterval(() => { txt.textContent = full.slice(0, ++i); if (i >= full.length) finish(); }, 35);
      S.onNext = () => { if (typing) finish(); else { S.onNext = null; res(); } }; // 1er clic = tout afficher, 2e = suite
    });
  }

  /* ---------- cutscene d'ouverture ---------- */
  async function welcome() {
    const my = ++S.run, alive = () => S.on && my === S.run;
    const ov = build(), bg = $("story-bg");
    bg.src = url(P.station);

    S.music = new Audio(url(P.music)); S.music.loop = true; S.music.volume = 0.5;
    S.music.play().catch(() => {});

    await sleep(50); if (!alive()) return;
    bg.classList.add("in");                       // fondu d'ouverture : 2 s
    await sleep(2000 + 5000); if (!alive()) return; // fondu (2 s) puis attente de 5 s
    bg.classList.add("dark");                     // l'image s'assombrit
    await sleep(1000); if (!alive()) return;

    for (const line of WELCOME) { await say(line); if (!alive()) return; }
    $("story-dlg").style.display = "none";
    // TODO : suite = tutoriel du joystick
  }

  /* ---------- API attendue par index.html ---------- */
  window.startStory = function () {
    currentGameMode = "story"; luckMultiplier = 1;
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("score").style.display = "none";
    document.getElementById("timer-display").style.display = "none";
    document.getElementById("adventure-hud").style.display = "none";
    document.getElementById("side-buttons").style.display = "none";
    document.getElementById("leave-game-btn").style.display = "flex";
    gameActive = true; apples = []; S.on = true;
    setMode("story"); update();
    welcome();
  };
  window.storyStop = function () {
    S.on = false; S.run++; S.onNext = null; clearInterval(S.timer);
    if (S.music) { S.music.pause(); S.music = null; }
    const ov = $("story-ov"); if (ov) ov.remove();
  };
  window.storyFrame = function (ctx) {};
  window.storyCollect = function (a) {};
})();