(() => {
  'use strict';
  const B = window.GAME_BALANCE;
  const GRIDS = window.GAME_GRIDS;
  const $ = (id) => document.getElementById(id);
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const images = new Map();
  const state = {
    scene: 'menu', location: 0, difficulty: 1, selected: 0, gold: 0, lives: 0, queue: [],
    archers: [], orcs: [], arrows: [], particles: [],
    wave: 0, spawned: 0, spawnClock: 0, intermission: B.firstWaveDelay,
    goldClock: 0, elapsed: 0, hover: null, notificationUntil: 0,
    lastFrame: 0, speed: 1
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

  function buildDifficulty() {
    $('difficulty-list').innerHTML = '';
    B.difficulties.forEach((mode, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'difficulty-card' + (index === state.difficulty ? ' selected' : '');
      button.setAttribute('aria-pressed', String(index === state.difficulty));
      button.innerHTML = `<span>${mode.name}</span><small>${mode.subtitle}</small>`;
      button.addEventListener('click', () => {
        state.difficulty = index;
        buildDifficulty();
      });
      $('difficulty-list').append(button);
    });
  }

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
      scene: 'playing', gold: difficulty().startingGold, lives: difficulty().startingLives,
      archers: [], orcs: [], arrows: [], particles: [],
      wave: 0, spawned: 0, spawnClock: 0, queue: waveQueue(0),
      intermission: B.firstWaveDelay, goldClock: 0,
      elapsed: 0, hover: null, notificationUntil: 0, speed: 1
    });
    $('menu').classList.add('hidden');
    $('game-screen').classList.remove('hidden');
    $('location-name').textContent = `${B.locations[state.location].name} · ${difficulty().name}`;
    selectArcher(0);
    refreshSpeed();
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

  // Quick pause from the speed bar: freezes the field without a dialog,
  // so towers can still be placed while thinking.
  function setSpeed(speed) {
    if (state.scene === 'paused' && !$('modal').classList.contains('hidden')) return;
    if (speed === 0) {
      if (state.scene !== 'playing') return;
      state.scene = 'paused';
      showMessage('Пауза — выбери скорость, чтобы продолжить', Infinity);
    } else {
      state.speed = speed;
      if (state.scene === 'paused') resume();
    }
    refreshSpeed();
  }
  function togglePause() { setSpeed(state.scene === 'playing' ? 0 : state.speed); }
  function refreshSpeed() {
    const paused = state.scene === 'paused';
    document.querySelectorAll('[data-speed]').forEach(button => {
      const value = Number(button.dataset.speed);
      button.setAttribute('aria-pressed', String(value === 0 ? paused : !paused && value === state.speed));
    });
  }

  function pause() {
    if (state.scene !== 'playing') return;
    state.scene = 'paused';
    refreshSpeed();
    showModal('Ⅱ', 'Пауза', 'Оборона ждёт твоего приказа.', [
      { text: 'Продолжить', action: resume },
      { text: 'Начать заново', action: startGame, secondary: true },
      { text: 'В меню', action: showMenu, secondary: true }
    ]);
  }
  function resume() {
    closeModal();
    state.scene = 'playing';
    state.lastFrame = performance.now();
    if (state.notificationUntil === Infinity) { $('board-message').classList.remove('visible'); state.notificationUntil = 0; }
    refreshSpeed();
  }
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
  function activeGrid() { return GRIDS[B.locations[state.location].id]; }
  function cellAt(lane, column) {
    const grid = activeGrid();
    const [top, bottom] = grid.rows[lane];
    const step = grid.step[lane];
    const right = grid.left[lane] + (column + 1) * step;
    const left = Math.max(right - step, grid.minX ? grid.minX[lane] : 0);
    return { lane, column, left, top, right, bottom,
      x: (left + right) / 2, y: (top + bottom) / 2 };
  }
  function nearestCell(point) {
    const grid = activeGrid();
    const lane = grid.rows.findIndex(([top, bottom]) => point.y >= top && point.y < bottom);
    if (lane < 0) return null;
    if (grid.minX && point.x < grid.minX[lane]) return null;
    const column = Math.floor((point.x - grid.left[lane]) / grid.step[lane]);
    return column >= 0 && column < grid.columns ? cellAt(lane, column) : null;
  }
  canvas.addEventListener('pointermove', event => { state.hover = nearestCell(boardPoint(event)); });
  canvas.addEventListener('pointerleave', () => { state.hover = null; });
  function archerAt(cell) { return state.archers.find(a => a.lane === cell.lane && a.column === cell.column); }
  // Upgrading costs a fraction of the next level's price and goes one level at a time.
  function upgradeCost(archer) {
    const next = B.archerLevels[archer.level + 1];
    return next ? Math.round(next.cost * B.upgradeCostFactor) : null;
  }
  function upgrade(archer) {
    const cost = upgradeCost(archer);
    if (cost === null) { showMessage('Лучник уже максимального уровня'); return; }
    if (state.gold < cost) { showMessage(`Для улучшения нужно ✦ ${cost}`); return; }
    const before = B.archerLevels[archer.level], after = B.archerLevels[archer.level + 1];
    state.gold -= cost;
    archer.level++;
    archer.hp += after.health - before.health;
    archer.glow = .6;
    showMessage(`${before.name} → ${after.name}`, 1.6);
    hud();
  }
  function canPlace() {
    return state.scene === 'playing' || (state.scene === 'paused' && $('modal').classList.contains('hidden'));
  }
  canvas.addEventListener('pointerdown', event => {
    if (!canPlace()) return;
    const cell = nearestCell(boardPoint(event));
    if (!cell) return;
    const existing = archerAt(cell);
    if (existing) { upgrade(existing); return; }
    const unit = B.archerLevels[state.selected];
    if (state.gold < unit.cost) { showMessage('Не хватает монет'); return; }
    state.gold -= unit.cost;
    // Boots stand on the row's centre line, body rises above it.
    state.archers.push({ ...cell, footY: cell.y, level: state.selected, hp: unit.health, cooldown: .22, action: 0, flash: 0, glow: .6 });
    hud();
  });

  function difficulty() { return B.difficulties[state.difficulty]; }
  // Spreads each wave's orc levels evenly through the wave, weakest first,
  // so stronger orcs arrive among the weaker ones instead of in one clump.
  function waveQueue(index) {
    const items = [];
    for (const [level, count] of B.waves[index].groups)
      for (let i = 0; i < count; i++) items.push({ level, key: (i + .5) / count + level * 1e-3 });
    return items.sort((a, b) => a.key - b.key).map(item => item.level);
  }
  function spawnOrc() {
    const level = state.queue[state.spawned] - 1;
    const tier = B.orcLevels[level];
    const location = B.locations[state.location];
    const mode = difficulty();
    // Cycle lanes before repeating, with a different starting lane each wave.
    const lane = (state.spawned * 2 + state.wave) % B.lanes;
    // Later waves get tougher faster on harder modes (healthRamp per wave).
    const hp = Math.round(tier.health * location.enemyHealth * mode.enemyHealth * (1 + mode.healthRamp * state.wave));
    const laneCell = cellAt(lane, 0);
    state.orcs.push({ x: B.spawnX, lane, y: laneCell.y, footY: laneCell.y, level,
      hp, maxHp: hp, damage: tier.damage * mode.enemyDamage, speed: tier.speed * mode.enemySpeed,
      attackClock: 0, action: 0, flash: 0 });
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
      state.gold += difficulty().passiveGold;
      hud();
    }
    if (state.intermission > 0) {
      state.intermission -= dt;
      if (state.intermission <= 0) showMessage(`Волна ${state.wave + 1} наступает!`, 2);
    } else if (state.spawned < state.queue.length) {
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
      state.queue = waveQueue(state.wave);
      state.intermission = B.betweenWaves;
      state.gold += B.waveBonus;
      hud();
      showMessage(`Волна отбита! +${B.waveBonus} монет. Следующая через ${B.betweenWaves} сек.`, 3.5);
    }

    for (const archer of state.archers) {
      const unit = B.archerLevels[archer.level];
      archer.cooldown -= dt;
      archer.action = Math.max(0, archer.action - dt);
      archer.flash = Math.max(0, archer.flash - dt);
      archer.glow = Math.max(0, archer.glow - dt);
      const target = state.orcs.filter(o => o.lane === archer.lane && o.x > archer.x + 22 && o.hp > 0).sort((a,b) => a.x-b.x)[0];
      if (target && archer.cooldown <= 0) {
        state.arrows.push({ x: archer.x + 28, y: archer.footY - B.archerBodyHeight * .5, lane: archer.lane, level: archer.level, damage: unit.attack });
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
        state.particles.push({ x: target.x, y: arrow.y, life: .35 });
        state.arrows.splice(i, 1);
        if (target.hp <= 0) {
          state.gold += Math.round(B.orcLevels[target.level].reward * B.locations[state.location].reward * difficulty().reward);
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
          defender.hp -= orc.damage;
          defender.flash = .18;
          orc.attackClock = tier.attackInterval;
        }
      } else {
        orc.x -= orc.speed * dt;
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

  // Scales each sheet row by its measured body so every pose has the same
  // on-screen height, boots on footY and body centred on x.
  function drawSprite(path, frame, row, x, footY, bodyHeight, columns, body) {
    const img = image(path);
    if (!img.complete || !img.naturalWidth) return;
    const sourceSize = img.naturalWidth / columns;
    const [top, foot, centerX] = body[row];
    const scale = bodyHeight / (foot - top);
    ctx.drawImage(img, frame * sourceSize, row * sourceSize, sourceSize, sourceSize,
      x - centerX * scale, footY - foot * scale, sourceSize * scale, sourceSize * scale);
  }
  function drawArcher(archer, tick) {
    const unit = B.archerLevels[archer.level];
    const h = B.archerBodyHeight;
    const frame = Math.floor(tick * 3.8 + archer.column) % 5;
    const row = archer.action > 0 ? 2 : 0;
    const actionFrame = archer.action > 0 ? Math.min(4, Math.floor((.48 - archer.action) * 10)) : frame;
    ctx.fillStyle = '#07110a68'; ctx.beginPath(); ctx.ellipse(archer.x, archer.footY - 3, 35, 8, 0, 0, Math.PI * 2); ctx.fill();
    drawSprite(unit.sprite, actionFrame, row, archer.x, archer.footY, h, 5, unit.body);
    if (archer.flash) { ctx.fillStyle = `rgba(255,80,56,${archer.flash * 1.8})`; ctx.fillRect(archer.x - 42, archer.footY - h, 84, h); }
    if (archer.hp < unit.health) {
      ctx.fillStyle = '#172012'; ctx.fillRect(archer.x - 35, archer.footY - h - 14, 70, 6);
      ctx.fillStyle = '#90c56c'; ctx.fillRect(archer.x - 34, archer.footY - h - 13, 68 * Math.max(0, archer.hp / unit.health), 4);
    }
    if (archer.glow) {
      ctx.strokeStyle = `rgba(255,224,140,${archer.glow * 1.6})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(archer.x, archer.footY, 30 + (.6 - archer.glow) * 60, 10 + (.6 - archer.glow) * 20, 0, 0, Math.PI * 2); ctx.stroke();
    }
    drawLevelBadge(archer.x - 46, archer.footY - h - 11, unit.level, unit.badge);
  }
  // Numbered tier circle drawn beside a unit's head, shared by archers and orcs.
  function drawLevelBadge(x, y, level, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a120f'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#1a120f'; ctx.font = '700 12px Rubik, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(level), x, y + .5);
  }
  function drawHover(cell) {
    const { left, right, top, bottom } = cell;
    const archer = archerAt(cell);
    const cost = archer ? upgradeCost(archer) : B.archerLevels[state.selected].cost;
    const ok = cost !== null && state.gold >= cost;
    ctx.fillStyle = ok ? 'rgba(238,207,123,.22)' : 'rgba(180,52,45,.24)';
    ctx.strokeStyle = ok ? '#e8cb82' : '#b85043';
    ctx.lineWidth = 2;
    ctx.fillRect(left + 5, top + 5, right - left - 10, bottom - top - 10);
    ctx.strokeRect(left + 5, top + 5, right - left - 10, bottom - top - 10);
  }
  function drawUpgradeTip(cell) {
    const archer = archerAt(cell);
    const cost = upgradeCost(archer);
    const ok = cost !== null && state.gold >= cost;
    const label = cost === null ? 'Макс. уровень' : `↑ ${B.archerLevels[archer.level + 1].name}  ✦ ${cost}`;
    ctx.font = '600 15px Rubik, Arial, sans-serif';
    const w = ctx.measureText(label).width + 18, y = cell.y - B.archerBodyHeight - 46;
    ctx.fillStyle = '#182a21ee'; ctx.fillRect(cell.x - w / 2, y, w, 26);
    ctx.strokeStyle = ok ? '#d1ae6c' : '#8a5a4a'; ctx.lineWidth = 1; ctx.strokeRect(cell.x - w / 2, y, w, 26);
    ctx.fillStyle = ok ? '#f3e1b6' : '#e7a593'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, cell.x, y + 13);
  }
  function drawOrc(orc, tick) {
    const tier = B.orcLevels[orc.level];
    const h = B.orcBodyHeight;
    const frame = Math.floor(tick * 5 + orc.lane) % 4;
    ctx.fillStyle = '#08100880'; ctx.beginPath(); ctx.ellipse(orc.x, orc.footY - 3, 40, 8, 0, 0, Math.PI * 2); ctx.fill();
    drawSprite(tier.sprite, frame, orc.action > 0 ? 2 : 1, orc.x, orc.footY, h, 4, tier.body);
    if (orc.flash) { ctx.fillStyle = `rgba(255,234,159,${orc.flash * 3})`; ctx.fillRect(orc.x - 40, orc.footY - h, 80, h); }
    ctx.fillStyle = '#1a120fe8'; ctx.fillRect(orc.x - 42, orc.footY - h - 20, 84, 11);
    ctx.fillStyle = '#a52e27'; ctx.fillRect(orc.x - 40, orc.footY - h - 18, 80 * Math.max(0, orc.hp / orc.maxHp), 7);
    ctx.strokeStyle = '#e0bd7c'; ctx.lineWidth = 1; ctx.strokeRect(orc.x - 42, orc.footY - h - 20, 84, 11);
    drawLevelBadge(orc.x - 52, orc.footY - h - 14.5, tier.level, tier.badge);
  }
  function draw() {
    if (state.scene === 'menu') return;
    const bg = image(B.locations[state.location].image);
    if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0, 1672, 941);
    else { ctx.fillStyle = '#354632'; ctx.fillRect(0, 0, 1672, 941); }
    if (state.hover && canPlace()) drawHover(state.hover);
    const tick = state.elapsed;
    // Draw back rows first so lower lanes overlap the ones behind them.
    const actors = [...state.archers, ...state.orcs].sort((a, b) => a.footY - b.footY);
    for (const actor of actors) 'column' in actor ? drawArcher(actor, tick) : drawOrc(actor, tick);
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
    // Upgrade tooltip sits above everything so units never hide it.
    if (state.hover && canPlace() && archerAt(state.hover)) drawUpgradeTip(state.hover);
  }

  function loop(now) {
    const dt = Math.min((now - (state.lastFrame || now)) / 1000, .05);
    state.lastFrame = now;
    // Faster speeds run extra fixed steps so arrows never skip past orcs.
    for (let i = 0; i < state.speed && state.scene === 'playing'; i++) update(dt);
    if (state.scene !== 'menu') draw();
    requestAnimationFrame(loop);
  }

  $('start-button').addEventListener('click', startGame);
  document.querySelectorAll('[data-speed]').forEach(button =>
    button.addEventListener('click', () => setSpeed(Number(button.dataset.speed))));
  $('menu-button').addEventListener('click', () => {
    if (state.scene === 'playing') pause();
    showModal('⌂', 'Вернуться в меню?', 'Текущая оборона начнётся заново, если ты снова выберешь локацию.', [
      { text: 'Остаться', action: resume },
      { text: 'В меню', action: showMenu, secondary: true }
    ]);
  });
  window.addEventListener('keydown', event => {
    if (['Digit1','Digit2','Digit3','Digit4'].includes(event.code) && state.scene === 'playing') selectArcher(Number(event.code.at(-1)) - 1);
    if (event.code === 'Space') { event.preventDefault(); togglePause(); }
    if (event.code === 'Escape' && state.scene === 'playing') pause();
  });
  // Read-only handle for game/balance-sim.cjs, which plays the game headlessly.
  window.GAME_DEBUG = { state, cellAt, update, draw };
  buildMenu();
  buildDifficulty();
  buildCards();
  requestAnimationFrame(loop);
})();
