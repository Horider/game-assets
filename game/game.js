(() => {
  'use strict';
  const B = window.GAME_BALANCE;
  const $ = (id) => document.getElementById(id);
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const images = new Map();
  const state = {
    scene: 'menu', location: 0, selected: 0, gold: 0, lives: 0,
    archers: [], orcs: [], arrows: [], particles: [],
    wave: 0, spawned: 0, spawnClock: 0, intermission: B.firstWaveDelay,
    goldClock: 0, elapsed: 0, hover: null, notificationUntil: 0,
    lastFrame: 0
  };

  function image(path) {
    if (!images.has(path)) {
      const item = new Image();
      item.src = path;
      images.set(path, item);
    }
    return images.get(path);
  }
  B.archerLevels.forEach(a => { image(a.sprite); image(a.arrow); });
  B.orcLevels.forEach(o => image(o.sprite));
  B.locations.forEach(l => image(l.image));

  function buildMenu() {
    $('location-list').innerHTML = '';
    B.locations.forEach((location, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'location-card' + (index === state.location ? ' selected' : '');
      button.innerHTML = `<img src="${location.image}" alt=""><span>${location.name}</span><small>${location.subtitle}</small>`;
      button.addEventListener('click', () => {
        state.location = index;
        buildMenu();
      });
      $('location-list').append(button);
    });
  }

  function buildCards() {
    $('archer-cards').innerHTML = '';
    B.archerLevels.forEach((unit, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'archer-card';
      card.innerHTML = `<span class="archer-thumb" style="background-image:url('${unit.sprite}')"></span><span class="archer-card-text"><strong>${unit.name}</strong><small>Уровень ${unit.level}</small><em>✦ ${unit.cost}</em></span>`;
      card.addEventListener('click', () => selectArcher(index));
      $('archer-cards').append(card);
    });
    refreshCards();
  }

  function selectArcher(index) {
    state.selected = index;
    refreshCards();
  }

  function refreshCards() {
    const unit = B.archerLevels[state.selected];
    Array.from($('archer-cards').children).forEach((card, index) => {
      card.classList.toggle('selected', index === state.selected);
      card.classList.toggle('unaffordable', B.archerLevels[index].cost > state.gold);
      card.setAttribute('aria-pressed', index === state.selected ? 'true' : 'false');
    });
    $('selected-detail').innerHTML = `<strong>${unit.name}</strong><br>Атака ${unit.attack} · Здоровье ${unit.health}<br>Скорость ${unit.speed} выстр./с`;
  }

  function hud() {
    $('gold-value').textContent = Math.floor(state.gold);
    $('wave-value').textContent = `${Math.min(state.wave + 1, B.waves.length)} / ${B.waves.length}`;
    $('lives-value').textContent = state.lives;
    refreshCards();
  }

  function showMessage(message, seconds = 2.6) {
    const box = $('board-message');
    box.textContent = message;
    box.classList.add('visible');
    state.notificationUntil = state.elapsed + seconds;
  }

  function startGame() {
    closeModal();
    Object.assign(state, {
      scene: 'playing', gold: B.startingGold, lives: B.startingLives,
      archers: [], orcs: [], arrows: [], particles: [],
      wave: 0, spawned: 0, spawnClock: 0,
      intermission: B.firstWaveDelay, goldClock: 0,
      elapsed: 0, hover: null, notificationUntil: 0
    });
    $('menu').classList.add('hidden');
    $('game-screen').classList.remove('hidden');
    $('location-name').textContent = B.locations[state.location].name;
    selectArcher(0);
    hud();
    showMessage('Расставь лучников — первая волна скоро придёт', 4);
  }

  function showMenu() {
    state.scene = 'menu';
    closeModal();
    $('game-screen').classList.add('hidden');
    $('menu').classList.remove('hidden');
    buildMenu();
  }

  function showModal(mark, title, copy, actions) {
    $('modal-mark').textContent = mark;
    $('modal-title').textContent = title;
    $('modal-copy').textContent = copy;
    $('modal-actions').innerHTML = '';
    actions.forEach(({ text, action, secondary }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      if (secondary) button.className = 'secondary';
      button.addEventListener('click', action);
      $('modal-actions').append(button);
    });
    $('modal').classList.remove('hidden');
  }

  function closeModal() { $('modal').classList.add('hidden'); }

  function pause() {
    if (state.scene !== 'playing') return;
    state.scene = 'paused';
    showModal('Ⅱ', 'Пауза', 'Оборона ждёт твоего приказа.', [
      { text: 'Продолжить', action: resume },
      { text: 'Начать заново', action: startGame, secondary: true },
      { text: 'В меню', action: showMenu, secondary: true }
    ]);
  }
  function resume() { closeModal(); state.scene = 'playing'; state.lastFrame = performance.now(); }
  function finish(victory) {
    state.scene = victory ? 'won' : 'lost';
    showModal(victory ? '✦' : '✕', victory ? 'Форпост устоял' : 'Ворота пали',
      victory ? 'Все четыре волны отбиты. Лучники сохранили рубеж.' : 'Орки прорвались через пять дорог. Попробуй другую расстановку.', [
        { text: 'Играть снова', action: startGame },
        { text: 'Выбрать локацию', action: showMenu, secondary: true }
      ]);
  }

  function boardPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height };
  }
  function nearestCell(point) {
    let best = null;
    let distance = Infinity;
    B.laneCenters.forEach((y, lane) => B.columnCenters.forEach((x, column) => {
      const dx = (point.x - x) / 72;
      const dy = (point.y - y) / 58;
      const d = dx * dx + dy * dy;
      if (d < distance) { distance = d; best = { lane, column, x, y }; }
    }));
    return distance <= 1 ? best : null;
  }
  canvas.addEventListener('pointermove', event => { state.hover = nearestCell(boardPoint(event)); });
  canvas.addEventListener('pointerleave', () => { state.hover = null; });
  canvas.addEventListener('pointerdown', event => {
    if (state.scene !== 'playing') return;
    const cell = nearestCell(boardPoint(event));
    if (!cell) return;
    if (state.archers.some(a => a.lane === cell.lane && a.column === cell.column)) {
      showMessage('Клетка занята'); return;
    }
    const unit = B.archerLevels[state.selected];
    if (state.gold < unit.cost) { showMessage('Не хватает монет'); return; }
    state.gold -= unit.cost;
    state.archers.push({ ...cell, level: state.selected, hp: unit.health, cooldown: .22, action: 0, flash: 0 });
    hud();
  });

  function spawnOrc() {
    const wave = B.waves[state.wave];
    const tier = B.orcLevels[wave.enemyLevel - 1];
    const location = B.locations[state.location];
    // Cycle lanes before repeating, with a different starting lane each wave.
    const lane = (state.spawned * 2 + state.wave) % B.lanes;
    const hp = Math.round(tier.health * location.enemyHealth);
    state.orcs.push({ x: B.spawnX + Math.random() * 25, lane, y: B.laneCenters[lane], level: wave.enemyLevel - 1,
      hp, maxHp: hp, attackClock: 0, action: 0, flash: 0 });
    state.spawned++;
  }

  function update(dt) {
    state.elapsed += dt;
    if (state.notificationUntil && state.elapsed > state.notificationUntil) {
      $('board-message').classList.remove('visible');
      state.notificationUntil = 0;
    }
    state.goldClock += dt;
    while (state.goldClock >= B.goldInterval) {
      state.goldClock -= B.goldInterval;
      state.gold += B.passiveGold;
      hud();
    }
    if (state.intermission > 0) {
      state.intermission -= dt;
      if (state.intermission <= 0) showMessage(`Волна ${state.wave + 1} наступает!`, 2);
    } else if (state.spawned < B.waves[state.wave].count) {
      state.spawnClock -= dt;
      if (state.spawnClock <= 0) {
        spawnOrc();
        state.spawnClock = B.waves[state.wave].interval;
      }
    } else if (!state.orcs.length) {
      if (state.wave === B.waves.length - 1) { finish(true); return; }
      state.wave++;
      state.spawned = 0;
      state.spawnClock = 0;
      state.intermission = B.betweenWaves;
      state.gold += 60;
      hud();
      showMessage(`Волна отбита! +60 монет. Следующая через ${B.betweenWaves} сек.`, 3.5);
    }

    for (const archer of state.archers) {
      const unit = B.archerLevels[archer.level];
      archer.cooldown -= dt;
      archer.action = Math.max(0, archer.action - dt);
      archer.flash = Math.max(0, archer.flash - dt);
      const target = state.orcs.filter(o => o.lane === archer.lane && o.x > archer.x + 22 && o.hp > 0).sort((a,b) => a.x-b.x)[0];
      if (target && archer.cooldown <= 0) {
        state.arrows.push({ x: archer.x + 39, y: archer.y - 12, lane: archer.lane, level: archer.level, damage: unit.attack });
        archer.cooldown = 1 / unit.speed;
        archer.action = .48;
      }
    }
    for (let i = state.arrows.length - 1; i >= 0; i--) {
      const arrow = state.arrows[i];
      arrow.x += B.projectileSpeed * dt;
      const target = state.orcs.find(o => o.lane === arrow.lane && Math.abs(o.x - arrow.x) < B.projectileHitRadius && o.hp > 0);
      if (target) {
        target.hp -= arrow.damage;
        target.flash = .13;
        state.particles.push({ x: target.x, y: target.y - 13, life: .35 });
        state.arrows.splice(i, 1);
        if (target.hp <= 0) {
          state.gold += Math.round(B.killGold * B.locations[state.location].reward);
          hud();
        }
      } else if (arrow.x > 1690) state.arrows.splice(i, 1);
    }
    for (const orc of state.orcs) {
      if (orc.hp <= 0) continue;
      const tier = B.orcLevels[orc.level];
      orc.flash = Math.max(0, orc.flash - dt);
      orc.action = Math.max(0, orc.action - dt);
      const defender = state.archers.filter(a => a.lane === orc.lane && Math.abs(a.x - orc.x) < 66).sort((a,b) => b.x-a.x)[0];
      if (defender) {
        orc.attackClock -= dt;
        orc.action = .45;
        if (orc.attackClock <= 0) {
          defender.hp -= tier.damage;
          defender.flash = .18;
          orc.attackClock = tier.attackInterval;
        }
      } else {
        orc.x -= tier.speed * dt;
        orc.attackClock = 0;
      }
    }
    state.archers = state.archers.filter(a => a.hp > 0);
    state.orcs = state.orcs.filter(o => {
      if (o.hp <= 0) return false;
      if (o.x <= B.gateX) {
        state.lives--;
        hud();
        showMessage('Орк прорвался к воротам!');
        if (state.lives <= 0) finish(false);
        return false;
      }
      return true;
    });
    state.particles.forEach(p => p.life -= dt);
    state.particles = state.particles.filter(p => p.life > 0);
  }

  function drawSprite(path, frame, row, x, y, size, columns) {
    const img = image(path);
    if (!img.complete || !img.naturalWidth) return;
    const sourceSize = img.naturalWidth / columns;
    ctx.drawImage(img, frame * sourceSize, row * sourceSize, sourceSize, sourceSize,
      x - size / 2, y - size / 2, size, size);
  }
  function draw() {
    if (state.scene === 'menu') return;
    const bg = image(B.locations[state.location].image);
    if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0, 1672, 941);
    else { ctx.fillStyle = '#354632'; ctx.fillRect(0, 0, 1672, 941); }
    ctx.fillStyle = 'rgba(6,22,12,.19)';
    ctx.fillRect(190, 163, 1280, 627);
    if (state.hover && state.scene === 'playing') {
      const { x, y, lane, column } = state.hover;
      const occupied = state.archers.some(a => a.lane === lane && a.column === column);
      ctx.fillStyle = occupied ? 'rgba(180,52,45,.35)' : 'rgba(238,207,123,.28)';
      ctx.strokeStyle = occupied ? '#b85043' : '#e8cb82';
      ctx.lineWidth = 3;
      ctx.fillRect(x - 65, y - 54, 130, 108);
      ctx.strokeRect(x - 65, y - 54, 130, 108);
    }
    // A small gate line clarifies where the defenders must hold.
    ctx.fillStyle = '#f0c371b3';
    ctx.fillRect(B.gateX - 4, 175, 4, 600);
    const tick = state.elapsed;
    for (const archer of state.archers) {
      const unit = B.archerLevels[archer.level];
      const frame = Math.floor(tick * 3.8 + archer.column) % 5;
      const row = archer.action > 0 ? 2 : 0;
      const actionFrame = archer.action > 0 ? Math.min(4, Math.floor((.48 - archer.action) * 10)) : frame;
      ctx.fillStyle = '#07110a68'; ctx.beginPath(); ctx.ellipse(archer.x, archer.y + 46, 43, 10, 0, 0, Math.PI * 2); ctx.fill();
      drawSprite(unit.sprite, actionFrame, row, archer.x, archer.y - 10, 161, 5);
      if (archer.flash) { ctx.fillStyle = `rgba(255,80,56,${archer.flash * 1.8})`; ctx.fillRect(archer.x - 50, archer.y - 66, 100, 115); }
      if (archer.hp < unit.health) {
        ctx.fillStyle = '#172012'; ctx.fillRect(archer.x - 35, archer.y - 64, 70, 6);
        ctx.fillStyle = '#90c56c'; ctx.fillRect(archer.x - 34, archer.y - 63, 68 * Math.max(0, archer.hp / unit.health), 4);
      }
    }
    for (const orc of state.orcs) {
      const tier = B.orcLevels[orc.level];
      const frame = Math.floor(tick * 5 + orc.lane) % 4;
      ctx.fillStyle = '#08100880'; ctx.beginPath(); ctx.ellipse(orc.x, orc.y + 47, 48, 10, 0, 0, Math.PI * 2); ctx.fill();
      drawSprite(tier.sprite, frame, orc.action > 0 ? 2 : 1, orc.x, orc.y - 8, 168, 4);
      if (orc.flash) { ctx.fillStyle = `rgba(255,234,159,${orc.flash * 3})`; ctx.fillRect(orc.x - 47, orc.y - 65, 94, 115); }
      ctx.fillStyle = '#1a120fe8'; ctx.fillRect(orc.x - 42, orc.y - 68, 84, 11);
      ctx.fillStyle = '#a52e27'; ctx.fillRect(orc.x - 40, orc.y - 66, 80 * Math.max(0, orc.hp / orc.maxHp), 7);
      ctx.strokeStyle = '#e0bd7c'; ctx.lineWidth = 1; ctx.strokeRect(orc.x - 42, orc.y - 68, 84, 11);
    }
    for (const arrow of state.arrows) {
      const img = image(B.archerLevels[arrow.level].arrow);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, 5, 125, 350, 112, arrow.x - 21, arrow.y - 8, 58, 19);
      else { ctx.fillStyle = '#f1dbab'; ctx.fillRect(arrow.x, arrow.y, 35, 3); }
    }
    for (const particle of state.particles) {
      ctx.strokeStyle = `rgba(255,207,99,${particle.life / .35})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, (1 - particle.life / .35) * 22, -.7, .7); ctx.stroke();
    }
  }

  function loop(now) {
    const dt = Math.min((now - (state.lastFrame || now)) / 1000, .05);
    state.lastFrame = now;
    if (state.scene === 'playing') update(dt);
    if (state.scene !== 'menu') draw();
    requestAnimationFrame(loop);
  }

  $('start-button').addEventListener('click', startGame);
  $('pause-button').addEventListener('click', pause);
  $('menu-button').addEventListener('click', () => {
    if (state.scene === 'playing') pause();
    showModal('⌂', 'Вернуться в меню?', 'Текущая оборона начнётся заново, если ты снова выберешь локацию.', [
      { text: 'Остаться', action: resume },
      { text: 'В меню', action: showMenu, secondary: true }
    ]);
  });
  window.addEventListener('keydown', event => {
    if (['Digit1','Digit2','Digit3','Digit4'].includes(event.code) && state.scene === 'playing') selectArcher(Number(event.code.at(-1)) - 1);
    if (event.code === 'Space') { event.preventDefault(); if (state.scene === 'playing') pause(); else if (state.scene === 'paused') resume(); }
    if (event.code === 'Escape' && state.scene === 'playing') pause();
  });
  buildMenu();
  buildCards();
  requestAnimationFrame(loop);
})();
