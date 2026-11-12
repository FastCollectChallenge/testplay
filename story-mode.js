/* ==========================================================================
   story-mode.js — Story Mode (cinématiques, dialogues, boss de fin)
   Chargé après le <script> principal de index.html. Utilise ses globales :
   canvas, ctx, ball, apples, gameActive, currentGameMode, update(), setMode()...
   Hooks dans index.html : startStory(), storyStop(), storyCollect(), storyFrame()
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Langue (fr / en). Forçable avec window.storyLang = 'fr' ---------- */
  const LANG = window.storyLang || ((navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  const tr = (en, fr) => (LANG === 'fr' ? fr : en);

  /* ---------- Personnages ---------- */
  const WHO = {
    narrator: { name: '', emoji: '📜' },
    bally:    { name: 'Bally', emoji: '🏐' },
    elder:    { name: 'Granny Smith', emoji: '🍏' },
    malus:    { name: 'Malus', emoji: '👑' },
  };
  const L = (who, en, fr, cine) => ({ who, text: tr(en, fr), cine: !!cine });

  /* ---------- Scénario ---------- */
  const PROLOGUE = [
    L('narrator', 'Once upon a time, the Great Orchard fed every ball, every joystick and every apple in the land.',
                  'Il était une fois le Grand Verger, qui nourrissait chaque balle, chaque joystick et chaque pomme du royaume.', true),
    L('narrator', 'Then one night, a shadow fell upon the trees... and the apples began to rot.',
                  'Puis, une nuit, une ombre tomba sur les arbres... et les pommes se mirent à pourrir.', true),
  ];

  const CHAPTERS = [
    { // ---- Chapitre 1
      intro: [
        L('elder', 'Bally! You came! The orchard is dying.', 'Bally ! Tu es venu ! Le verger se meurt.'),
        L('bally', "I'll follow my joystick anywhere, Granny. What do I do?", 'Je suivrai mon joystick n’importe où, Granny. Que dois-je faire ?'),
        L('elder', 'Collect 8 red apples to wake the trees. Just roll over them!', 'Ramasse 8 pommes rouges pour réveiller les arbres. Il suffit de rouler dessus !'),
      ],
      cfg: { banner: tr('Chapter 1 — The Orchard', 'Chapitre 1 — Le Verger'), title: tr('The Orchard', 'Le Verger'),
             objective: tr('Red apples:', 'Pommes rouges :'), goalType: 'red', goal: 8, maxGoal: 5, spawnEvery: 900 },
      outro: [],
    },
    { // ---- Chapitre 2
      intro: [
        L('elder', 'Wonderful! The trees are breathing again. But the rot comes from the Cursed Grove...',
                   'Magnifique ! Les arbres respirent de nouveau. Mais la pourriture vient du Bois Maudit...'),
        L('elder', 'Beware the Dark Apples there. They hurt! Gather 10 green apples and stay away from the black ones.',
                   'Méfie-toi des Pommes Noires, elles font mal ! Récolte 10 pommes vertes et évite les noires.'),
      ],
      cfg: { banner: tr('Chapter 2 — The Cursed Grove', 'Chapitre 2 — Le Bois Maudit'), title: tr('The Cursed Grove', 'Le Bois Maudit'),
             objective: tr('Green apples:', 'Pommes vertes :'), goalType: 'green', goal: 10, maxGoal: 4, spawnEvery: 1100,
             hazardEvery: 1700, maxHazard: 4, hearts: true },
      outro: [],
    },
    { // ---- Chapitre 3 : BOSS
      intro: [
        L('malus', 'Who dares steal MY rot?', 'Qui ose voler MA pourriture ?'),
        L('bally', 'Malus, the Rotten King!', 'Malus, le Roi Pourri !'),
        L('elder', 'Golden apples hurt him. Roll over them, and dodge his shadow orbs!',
                   'Les pommes dorées le blessent. Roule dessus et esquive ses orbes d’ombre !'),
        L('malus', "Foolish ball. I'll turn you into cider!", 'Pauvre balle. Je vais faire de toi du cidre !'),
      ],
      cfg: { banner: tr('Final Chapter — Malus the Rotten King', 'Chapitre final — Malus, le Roi Pourri'), title: 'Malus, the Rotten King',
             objective: tr('Roll over golden apples to hurt Malus!', 'Roule sur les pommes dorées pour blesser Malus !'),
             goalType: 'golden', hearts: true, boss: 8, minY: 230 },
      outro: [
        L('malus', 'Impossible... I was the best... apple...', 'Impossible... j’étais la meilleure... pomme...'),
      ],
    },
  ];

  const EPILOGUE = [
    L('narrator', 'The shadow lifted. All the trees blossomed at once.', 'L’ombre se leva. Tous les arbres fleurirent en même temps.', true),
    L('elder', 'You saved the orchard, Bally.', 'Tu as sauvé le verger, Bally.'),
    L('bally', 'Anything for the apples. And for the joystick.', 'Tout pour les pommes. Et pour le joystick.'),
    L('narrator', 'THE END', 'FIN', true),
  ];

  /* ---------- Interface (DOM + CSS injectés) ---------- */
  const style = document.createElement('style');
  style.textContent = `
#story-root{position:fixed;inset:0;z-index:15;pointer-events:none;display:none;color:#fff;font-family:'Google Sans',system-ui,sans-serif}
#story-root.flash::after{content:'';position:absolute;inset:0;background:rgba(255,40,40,.35);animation:sFlash .45s forwards}
@keyframes sFlash{to{opacity:0}}
#story-cine{position:absolute;inset:0;background:#000;display:none;align-items:center;justify-content:center;padding:10vw;box-sizing:border-box;text-align:center;font-size:clamp(20px,3vw,38px);font-style:italic;line-height:1.5;pointer-events:auto;cursor:pointer}
#story-box{position:absolute;left:50%;bottom:7vh;transform:translateX(-50%);width:min(820px,90vw);background:rgba(0,0,0,.88);border:4px solid #f1c40f;border-radius:20px;padding:16px 24px 20px;box-sizing:border-box;display:none;pointer-events:auto;cursor:pointer}
#story-name{font-weight:900;color:#f1c40f;font-size:clamp(16px,2vw,22px);margin-bottom:6px}
#story-text{font-size:clamp(16px,2vw,24px);line-height:1.45;min-height:2.9em}
#story-next{position:absolute;right:18px;bottom:8px;color:#f1c40f;animation:sBlink 1s infinite}
@keyframes sBlink{50%{opacity:.2}}
#story-hud{position:absolute;top:16px;left:50%;transform:translateX(-50%);display:none;flex-direction:column;align-items:center;gap:6px;text-shadow:0 2px 6px #000;text-align:center}
#story-title{font-weight:900;font-size:clamp(14px,1.6vw,20px);color:#f1c40f}
#story-goal{font-size:clamp(14px,1.6vw,20px)}
#story-hearts{font-size:clamp(20px,2.4vw,30px);letter-spacing:4px}
#story-bossbar{display:none;width:min(480px,70vw);height:18px;border:3px solid #f1c40f;border-radius:10px;background:#220;overflow:hidden}
#story-bossfill{height:100%;width:100%;background:linear-gradient(90deg,#8b0000,#ff3838);transition:width .25s}
#story-banner{position:absolute;top:38%;left:0;width:100%;text-align:center;font-size:clamp(26px,5vw,60px);font-weight:900;color:#f1c40f;text-shadow:0 4px 14px #000;opacity:0}
#story-banner.show{animation:sBanner 2s forwards}
@keyframes sBanner{0%{opacity:0;transform:scale(.8)}15%,85%{opacity:1;transform:scale(1)}100%{opacity:0}}
#story-end{position:absolute;inset:0;background:rgba(0,0,0,.82);display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;pointer-events:auto;padding:6vw;box-sizing:border-box}
#story-end h1{margin:0;font-size:clamp(30px,6vw,70px);color:#f1c40f}
#story-end p{margin:0;font-size:clamp(16px,2vw,24px)}
#story-end-btns{display:flex;gap:16px;margin-top:10px;flex-wrap:wrap;justify-content:center}
.story-btn{background:#000;color:#fff;border:3px solid #f1c40f;border-radius:14px;padding:12px 26px;font-size:clamp(16px,1.8vw,22px);font-weight:900;cursor:pointer;font-family:inherit}
.story-btn:hover{background:#f1c40f;color:#000}`;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'story-root';
  root.innerHTML = `
<div id="story-cine"><div id="story-cine-text"></div></div>
<div id="story-box"><div id="story-name"></div><div id="story-text"></div><div id="story-next">▶</div></div>
<div id="story-hud"><div id="story-title"></div><div id="story-goal"></div><div id="story-hearts"></div>
  <div id="story-bossbar"><div id="story-bossfill"></div></div></div>
<div id="story-banner"></div>
<div id="story-end"><h1 id="story-end-title"></h1><p id="story-end-text"></p><div id="story-end-btns"></div></div>`;
  document.body.appendChild(root);

  const $ = (id) => document.getElementById(id);
  const el = {
    cine: $('story-cine'), cineText: $('story-cine-text'), box: $('story-box'), name: $('story-name'), text: $('story-text'),
    hud: $('story-hud'), title: $('story-title'), goal: $('story-goal'), hearts: $('story-hearts'),
    bossBar: $('story-bossbar'), bossFill: $('story-bossfill'), banner: $('story-banner'),
    end: $('story-end'), endTitle: $('story-end-title'), endText: $('story-end-text'), endBtns: $('story-end-btns'),
  };

  /* ---------- État ---------- */
  let run = 0;              // identifiant de la partie en cours (annule les anciennes)
  let advance = null;       // fonction "suivant" du dialogue en cours
  let typingTimer = null;
  const S = { phase: 'idle', cfg: null, hearts: 3, count: 0, boss: null, shots: [], invuln: 0, last: 0, t: {}, result: null, finish: null };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Dialogues (machine à écrire) ---------- */
  function say(lines) {
    return new Promise((resolve) => {
      let i = 0, typing = null;
      const next = () => {
        if (typing) { clearInterval(typingTimer); typing.el.textContent = typing.text; typing = null; return; }
        if (i >= lines.length) {
          advance = null; el.box.style.display = 'none'; el.cine.style.display = 'none'; root.style.pointerEvents = 'none';
          resolve(); return;
        }
        const l = lines[i++], c = WHO[l.who];
        let target;
        if (l.cine) { el.cine.style.display = 'flex'; el.box.style.display = 'none'; target = el.cineText; }
        else { el.cine.style.display = 'none'; el.box.style.display = 'block'; el.name.textContent = (c.emoji + ' ' + c.name).trim(); target = el.text; }
        target.textContent = '';
        const t = { el: target, text: l.text }; typing = t; let k = 0;
        clearInterval(typingTimer);
        typingTimer = setInterval(() => {
          k++; t.el.textContent = t.text.slice(0, k);
          if (k >= t.text.length) { clearInterval(typingTimer); if (typing === t) typing = null; }
        }, 24);
      };
      advance = next; root.style.pointerEvents = 'auto'; next();
    });
  }
  root.addEventListener('click', () => { if (advance) advance(); });
  document.addEventListener('keydown', (e) => {
    if (advance && (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight')) { e.preventDefault(); advance(); }
  });

  /* ---------- Bannière & écran de fin ---------- */
  async function banner(text, ms) {
    el.banner.textContent = text; el.banner.classList.remove('show'); void el.banner.offsetWidth; el.banner.classList.add('show');
    await wait(ms); el.banner.classList.remove('show');
  }
  function endPanel(title, text, buttons) {
    return new Promise((resolve) => {
      el.endTitle.textContent = title; el.endText.textContent = text; el.endBtns.innerHTML = '';
      buttons.forEach((b) => {
        const btn = document.createElement('button'); btn.className = 'story-btn'; btn.textContent = b.label;
        btn.onclick = () => { el.end.style.display = 'none'; resolve(b.id); };
        el.endBtns.appendChild(btn);
      });
      el.end.style.display = 'flex';
    });
  }

  /* ---------- HUD ---------- */
  function updateHud() {
    const cfg = S.cfg; if (!cfg) return;
    el.hud.style.display = 'flex'; el.title.textContent = cfg.title;
    el.hearts.style.display = cfg.hearts ? '' : 'none';
    el.hearts.textContent = '❤️'.repeat(Math.max(0, S.hearts)) + '🖤'.repeat(Math.max(0, 3 - S.hearts));
    if (S.boss) { el.goal.textContent = cfg.objective; el.bossBar.style.display = 'block'; el.bossFill.style.width = Math.max(0, S.boss.hp / S.boss.max * 100) + '%'; }
    else { el.bossBar.style.display = 'none'; el.goal.textContent = cfg.objective + ' ' + S.count + ' / ' + cfg.goal; }
  }

  /* ---------- Gameplay ---------- */
  const countType = (type) => apples.filter((a) => a.type === type).length;

  function spawn(type, size, life) {
    const m = 60, minY = (S.cfg && S.cfg.minY) || m; let x, y, n = 0;
    do {
      x = m + Math.random() * (canvas.width - 2 * m);
      y = minY + Math.random() * Math.max(10, canvas.height - minY - m); n++;
    } while (n < 12 && Math.hypot(x - ball.x, y - ball.y) < 170);
    apples.push({ x, y, size, type, born: performance.now(), life: life || 0 });
  }

  function hurt() {
    const now = performance.now();
    if (S.phase !== 'play' || !S.cfg.hearts || now < S.invuln) return;
    S.hearts--; S.invuln = now + 1300;
    root.classList.remove('flash'); void root.offsetWidth; root.classList.add('flash');
    updateHud(); if (S.hearts <= 0) S.result = 'lose';
  }

  function hitBoss() {
    const b = S.boss; if (!b) return;
    b.hp--; b.flash = performance.now() + 160; updateHud();
    if (!b.enraged && b.hp <= Math.floor(b.max / 2)) {
      b.enraged = true;
      el.banner.textContent = tr('Malus is enraged!', 'Malus est en rage !'); el.banner.classList.remove('show'); void el.banner.offsetWidth; el.banner.classList.add('show');
    }
    if (b.hp <= 0) S.result = 'win';
  }

  function finishPlay(res) {
    S.phase = 'idle'; apples = []; S.shots = []; el.hud.style.display = 'none';
    const f = S.finish; S.finish = null; if (f) f(res);
  }

  function play(cfg) {
    return new Promise((resolve) => {
      apples = []; S.cfg = cfg; S.count = 0; S.hearts = 3; S.shots = []; S.result = null; S.invuln = 0;
      S.finish = resolve; S.last = performance.now();
      const now = S.last; S.t = { spawn: now + 400, hazard: now + 1500, gold: now + 800, shot: now + 2200 };
      S.boss = cfg.boss ? { x: canvas.width / 2, y: 120, hp: cfg.boss, max: cfg.boss, t: 0, flash: 0, enraged: false } : null;
      updateHud(); S.phase = 'play';
    });
  }

  /* Appelé par index.html quand la balle touche une pomme (ne PAS modifier `apples` ici) */
  window.storyCollect = function (a) {
    if (S.phase !== 'play') return;
    if (a.type === 'dark') { hurt(); return; }
    if (a.type !== S.cfg.goalType) return;
    if (S.boss) { hitBoss(); return; }
    S.count++; updateHud(); if (S.count >= S.cfg.goal) S.result = 'win';
  };

  /* Appelé par index.html à chaque image (après le dessin des pommes) */
  window.storyFrame = function (c) {
    if (S.phase !== 'play') return;
    const now = performance.now(), dt = Math.min(50, now - S.last), k = dt / 16.67; S.last = now;
    const cfg = S.cfg, W = canvas.width;

    apples = apples.filter((a) => !a.life || now - a.born < a.life);

    if (now >= S.t.spawn && !S.boss) {
      if (countType(cfg.goalType) < cfg.maxGoal) spawn(cfg.goalType, 25, 0);
      S.t.spawn = now + cfg.spawnEvery;
    }
    if (cfg.hazardEvery && now >= S.t.hazard) {
      if (countType('dark') < cfg.maxHazard) spawn('dark', 32, 6500);
      S.t.hazard = now + cfg.hazardEvery;
    }
    if (S.boss && now >= S.t.gold) {
      if (countType('golden') < 2) spawn('golden', 32, 7000);
      S.t.gold = now + 2600;
    }

    // anneau d'avertissement autour des pommes noires
    c.save(); c.lineWidth = 3; c.strokeStyle = 'rgba(255,60,60,.85)';
    apples.forEach((a) => { if (a.type === 'dark') { c.beginPath(); c.arc(a.x, a.y, a.size * 0.9 + Math.sin(now / 150) * 3, 0, Math.PI * 2); c.stroke(); } });
    c.restore();

    // ----- Boss -----
    const b = S.boss;
    if (b) {
      b.t += dt;
      b.x = W / 2 + Math.sin(b.t * (b.enraged ? 0.0016 : 0.0009)) * (W * 0.34);
      b.y = 120 + Math.sin(b.t * 0.002) * 18;

      if (now >= S.t.shot) {
        const ang = Math.atan2(ball.y - b.y, ball.x - b.x), sp = b.enraged ? 3.6 : 2.7;
        (b.enraged ? [ang - 0.3, ang, ang + 0.3] : [ang]).forEach((an) => S.shots.push({ x: b.x, y: b.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp }));
        S.t.shot = now + (b.enraged ? 1300 : 1900);
      }

      c.save();
      if (now < b.flash) { c.shadowColor = '#fff'; c.shadowBlur = 45; } else { c.shadowColor = 'rgba(255,0,0,.9)'; c.shadowBlur = 30; }
      const img = (typeof IMAGES_CACHE !== 'undefined') && IMAGES_CACHE.dark;
      if (img && img.complete && img.naturalWidth > 0) c.drawImage(img, b.x - 70, b.y - 70, 140, 140);
      else { c.font = '110px serif'; c.textAlign = 'center'; c.fillText('🍎', b.x, b.y + 35); }
      c.shadowBlur = 0; c.font = '56px serif'; c.textAlign = 'center'; c.fillText('👑', b.x, b.y - 62);
      c.restore();
    }

    // ----- Projectiles du boss -----
    S.shots = S.shots.filter((s) => {
      s.x += s.vx * k; s.y += s.vy * k;
      if (s.x < -50 || s.y < -50 || s.x > canvas.width + 50 || s.y > canvas.height + 50) return false;
      if (Math.hypot(s.x - ball.x, s.y - ball.y) < 34) { hurt(); return false; }
      const g = c.createRadialGradient(s.x, s.y, 2, s.x, s.y, 16);
      g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#a020f0'); g.addColorStop(1, 'rgba(20,0,30,0)');
      c.save(); c.fillStyle = g; c.shadowColor = '#a020f0'; c.shadowBlur = 18;
      c.beginPath(); c.arc(s.x, s.y, 16, 0, Math.PI * 2); c.fill(); c.restore();
      return true;
    });

    // halo d'invulnérabilité autour de la balle
    if (now < S.invuln && Math.floor(now / 90) % 2 === 0) {
      c.save(); c.strokeStyle = 'rgba(80,220,255,.9)'; c.lineWidth = 4; c.beginPath(); c.arc(ball.x, ball.y, 30, 0, Math.PI * 2); c.stroke(); c.restore();
    }

    if (S.result) finishPlay(S.result);
  };

  /* ---------- Déroulement de l'histoire ---------- */
  async function begin(from) {
    const me = ++run, ok = () => me === run;
    resetUi(); root.style.display = 'block';

    if (from === 0) { await say(PROLOGUE); if (!ok()) return; }

    for (let i = from; i < CHAPTERS.length; i++) {
      const ch = CHAPTERS[i];
      if (ch.intro.length) { await say(ch.intro); if (!ok()) return; }
      let res;
      do {
        await banner(ch.cfg.banner, 2000); if (!ok()) return;
        res = await play(ch.cfg); if (!ok()) return;
        if (res === 'lose') {
          const choice = await endPanel(tr('Defeated...', 'Vaincu...'),
            tr('Rotten apples got the better of you. Try again?', 'Les pommes pourries ont eu raison de toi. Réessayer ?'),
            [{ id: 'retry', label: tr('Retry', 'Réessayer') }, { id: 'menu', label: tr('Menu', 'Menu') }]);
          if (!ok()) return;
          if (choice === 'menu') { leaveGame(); return; }
        }
      } while (res === 'lose');
      if (ch.outro.length) { await say(ch.outro); if (!ok()) return; }
    }

    await say(EPILOGUE); if (!ok()) return;
    const last = await endPanel(tr('Victory!', 'Victoire !'),
      tr('The Great Orchard is saved. Thank you for playing!', 'Le Grand Verger est sauvé. Merci d’avoir joué !'),
      [{ id: 'replay', label: tr('Play again', 'Rejouer') }, { id: 'menu', label: tr('Menu', 'Menu') }]);
    if (!ok()) return;
    if (last === 'replay') { apples = []; begin(0); } else leaveGame();
  }

  function resetUi() {
    clearInterval(typingTimer); advance = null;
    el.cine.style.display = 'none'; el.box.style.display = 'none'; el.hud.style.display = 'none';
    el.end.style.display = 'none'; el.banner.classList.remove('show');
    root.style.pointerEvents = 'none'; root.classList.remove('flash');
    S.phase = 'idle'; S.cfg = null; S.boss = null; S.shots = []; S.result = null; S.finish = null;
  }

  /* ---------- Points d'entrée (appelés depuis index.html) ---------- */
  window.startStory = function () {
    currentGameMode = 'story'; luckMultiplier = 1; currentLuck = 0.05; setSpawnPanel(false); setMode('story');
    const g = (id) => document.getElementById(id);
    g('home-screen').style.display = 'none';
    g('score').style.display = 'none'; g('timer-display').style.display = 'none'; g('adventure-hud').style.display = 'none';
    g('leave-game-btn').style.display = 'flex'; g('side-buttons').style.display = 'none';
    gameActive = true; apples = []; ball.speed = ball.baseSpeed;
    if (gameSpawnInterval) { clearInterval(gameSpawnInterval); gameSpawnInterval = null; }
    update(); begin(0);
  };

  window.storyStop = function () {
    run++; resetUi(); root.style.display = 'none';
  };
})();