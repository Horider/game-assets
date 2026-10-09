// Headless balance check: plays every location × difficulty with simple bots.
// Run with: node game/balance-sim.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function play(locationIndex, difficultyIndex, bot) {
  const elements = new Map();
  let frame;
  const noop = () => {};
  const anything = new Proxy(function () {}, { get: () => anything, apply: () => anything });
  const element = (id = '') => ({
    id, width: 1672, height: 941, children: [], listeners: {}, textContent: '', dataset: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => true },
    set innerHTML(v) { this.children = []; }, get innerHTML() { return ''; },
    append(c) { this.children.push(c); }, addEventListener(n, f) { this.listeners[n] = f; },
    setAttribute: noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1672, height: 941 }),
    getContext: () => anything
  });
  const document = { querySelectorAll: () => [], getElementById: id => elements.get(id) || elements.set(id, element(id)).get(id), createElement: () => element() };
  const window = { addEventListener: noop };
  class Image { constructor() { this.complete = true; this.naturalWidth = 1810; } }
  let now = 0;
  const context = vm.createContext({ window, document, Image, performance: { now: () => now }, requestAnimationFrame: f => { frame = f; }, Math, console });
  for (const file of ['balance.js', 'grid.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context);
  const { state, cellAt } = window.GAME_DEBUG;
  const B = window.GAME_BALANCE;
  document.getElementById('location-list').children[locationIndex].listeners.click();
  document.getElementById('difficulty-list').children[difficultyIndex].listeners.click();
  document.getElementById('start-button').listeners.click();
  const click = (lane, column) => { const c = cellAt(lane, column); document.getElementById('board').listeners.pointerdown({ clientX: c.x, clientY: c.y }); };
  const api = { state, B, click, select: i => { state.selected = i; } };
  let earned = 0, last = state.gold, lostArchers = 0, archerCount = 0;
  const leaks = B.waves.map(() => 0);
  let lives = state.lives;
  for (let t = 0; t < 20 * 60 * 20 && state.scene === 'playing'; t++) {
    now += 50; frame(now);
    if (state.gold > last) earned += state.gold - last;
    if (state.archers.length < archerCount) lostArchers += archerCount - state.archers.length;
    if (state.lives < lives) { if (process.env.DEBUG) console.log("leak t=" + (t / 20).toFixed(1), "lanes", [0,1,2,3,4].map(l => state.archers.filter(a => a.lane === l).length).join(""), "gold", Math.round(state.gold)); leaks[state.wave] += lives - state.lives; lives = state.lives; }
    if (t % 5 === 0) bot(api);
    last = state.gold;
    archerCount = state.archers.length;
  }
  return { won: state.scene === 'won', lives: state.lives, wave: state.wave + 1, earned: Math.round(earned), archers: state.archers.length, lostArchers, leaks };
}

const LANES = [0, 1, 2, 3, 4];
const SPAWN_ORDER = [0, 2, 4, 1, 3]; // lanes in the order the first orcs of a wave use
const dps = u => u.attack * u.speed;
const laneArchers = (state, lane) => state.archers.filter(a => a.lane === lane);
const laneDps = (state, B, lane) => laneArchers(state, lane).reduce((s, a) => s + dps(B.archerLevels[a.level]), 0);
const freeColumn = (state, B, lane, from) => {
  const columns = window_columns(state, B);
  for (let c = from; c < columns; c++) if (!state.archers.some(a => a.lane === lane && a.column === c)) return c;
  for (let c = from - 1; c >= 0; c--) if (!state.archers.some(a => a.lane === lane && a.column === c)) return c;
  return null;
};
const window_columns = () => 7;
// Incoming orc health per unit of lane damage: the lane that will break first.
const threat = (state, B, lane) => {
  const hp = state.orcs.filter(o => o.lane === lane).reduce((s, o) => s + o.hp, 0);
  return (hp + 1) / (laneDps(state, B, lane) + 1);
};
const weakest = (state, B) => [...LANES].sort((a, b) => laneDps(state, B, a) - laneDps(state, B, b))[0];
const mostThreatened = (state, B) => [...LANES].sort((a, b) => threat(state, B, b) - threat(state, B, a))[0];
const fewest = state => [...LANES].sort((a, b) => laneArchers(state, a).length - laneArchers(state, b).length)[0];

function buy(api, lane, level, column) {
  const { state, B, click, select } = api;
  if (B.archerLevels[level].cost > state.gold) return false;
  const c = freeColumn(state, B, lane, column); if (c === null) return false;
  select(level); click(lane, c); return true;
}
function upgradeIn(api, lane) {
  const { state } = api;
  const target = laneArchers(state, lane).filter(a => a.level < 3).sort((a, b) => a.level - b.level)[0];
  if (!target) return false;
  const before = state.gold; api.click(target.lane, target.column); return state.gold < before;
}
function cover(api, level, order, column) {
  const empty = order.find(l => !laneArchers(api.state, l).length);
  if (empty === undefined) return 'done';
  buy(api, empty, level, column);
  return 'busy';
}
// Best damage-per-coin action that is affordable right now in `lane`.
function bestNow(api, lane, column) {
  const { state, B } = api;
  const options = [];
  for (let l = 0; l < 4; l++) if (B.archerLevels[l].cost <= state.gold) options.push({ v: dps(B.archerLevels[l]) / B.archerLevels[l].cost, run: () => buy(api, lane, l, column) });
  const up = laneArchers(state, lane).filter(a => a.level < 3).sort((a, b) => a.level - b.level)[0];
  if (up) { const next = B.archerLevels[up.level + 1], cost = Math.round(next.cost * B.upgradeCostFactor);
    if (cost <= state.gold) options.push({ v: (dps(next) - dps(B.archerLevels[up.level])) / cost, run: () => upgradeIn(api, lane) }); }
  options.sort((a, b) => b.v - a.v);
  for (const o of options) if (o.run()) return true;
  return false;
}
const urgent = (state, B, lane) => state.orcs.some(o => o.lane === lane && o.x < 900) && threat(state, B, lane) > 8;

const bots = {
  'Спам ур.1':          api => buy(api, fewest(api.state), 0, 1),
  'Спам ур.2':          api => buy(api, fewest(api.state), 1, 1),
  'Спам ур.3':          api => buy(api, fewest(api.state), 2, 1),
  'Только ур.4':        api => buy(api, weakest(api.state, api.B), 3, 1),
  'Ряды+апгрейды':      api => cover(api, 0, LANES, 1) === 'done' && upgradeIn(api, weakest(api.state, api.B)),
  'Ряды+копить ур.4':   api => cover(api, 0, LANES, 1) === 'done' && buy(api, weakest(api.state, api.B), 3, 1),
  'Угроза+выгода':      api => cover(api, 0, SPAWN_ORDER, 1) === 'done' && bestNow(api, mostThreatened(api.state, api.B), 1),
  'Угроза+копить':      api => { if (cover(api, 0, SPAWN_ORDER, 1) !== 'done') return; const lane = mostThreatened(api.state, api.B);
                                  if (urgent(api.state, api.B, lane)) bestNow(api, lane, 1); else buy(api, lane, 3, 1); },
  'Задний ряд':         api => cover(api, 0, SPAWN_ORDER, 0) === 'done' && bestNow(api, mostThreatened(api.state, api.B), 0),
  'Передний ряд':       api => cover(api, 0, SPAWN_ORDER, 3) === 'done' && bestNow(api, mostThreatened(api.state, api.B), 3)
};

const B = (() => { const w = {}; vm.runInContext(fs.readFileSync(path.join(__dirname, 'balance.js'), 'utf8'), vm.createContext({ window: w })); return w.GAME_BALANCE; })();
const only = process.argv[2];
console.log('10 тактик × 4 карты. W(n) — победа, n жизней осталось; L@n — поражение на волне n; 🏹 — потеряно лучников');
const summary = {};
for (const [di, d] of B.difficulties.entries()) {
  if (only && d.id !== only) continue;
  console.log(`\n${d.name}`.padEnd(20) + B.locations.map(l => l.name.padEnd(18)).join(''));
  let wins = 0, total = 0;
  for (const name of Object.keys(bots)) {
    const row = B.locations.map((l, li) => { const r = play(li, di, bots[name]); total++; if (r.won) wins++;
      return ((r.won ? `W(${r.lives})` : `L@${r.wave}`) + ` −${r.lostArchers}🏹`).padEnd(18); });
    console.log(`  ${name.padEnd(18)}${row.join('')}`);
  }
  console.log(`  Побед: ${wins} из ${total}`);
}
