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

const dps = u => u.attack * u.speed;
const laneDps = (state, B, lane) => state.archers.filter(a => a.lane === lane).reduce((s, a) => s + dps(B.archerLevels[a.level]), 0);
const weakestLane = (state, B) => [0, 1, 2, 3, 4].sort((a, b) => laneDps(state, B, a) - laneDps(state, B, b))[0];
const freeColumn = (state, lane, from = 1) => { for (let c = from; c < 7; c++) if (!state.archers.some(a => a.lane === lane && a.column === c)) return c; return null; };

const bots = {
  // Buys the cheapest archer whenever it can, spreading lanes evenly.
  naive({ state, B, click, select }) {
    if (state.gold < B.archerLevels[0].cost) return;
    const lane = [0, 1, 2, 3, 4].sort((a, b) => state.archers.filter(x => x.lane === a).length - state.archers.filter(x => x.lane === b).length)[0];
    const column = freeColumn(state, lane); if (column === null) return;
    select(0); click(lane, column);
  },
  // Covers every lane, then strengthens the weakest lane with upgrades.
  upgrader({ state, B, click, select }) {
    const empty = [0, 1, 2, 3, 4].find(l => !state.archers.some(a => a.lane === l));
    if (empty !== undefined) { if (state.gold >= B.archerLevels[0].cost) { select(0); click(empty, 1); } return; }
    const lane = weakestLane(state, B);
    const target = state.archers.filter(a => a.lane === lane && a.level < 3).sort((a, b) => a.level - b.level)[0];
    if (target) { click(target.lane, target.column); return; }
    const column = freeColumn(state, lane); if (column !== null && state.gold >= 65) { select(0); click(lane, column); }
  },
  // Covers every lane, then buys the strongest affordable archer for the weakest lane.
  smart({ state, B, click, select }) {
    const empty = [0, 1, 2, 3, 4].find(l => !state.archers.some(a => a.lane === l));
    const lane = empty !== undefined ? empty : weakestLane(state, B);
    const wantLevel = empty !== undefined ? 0 : 3;
    let level = wantLevel; while (level > 0 && B.archerLevels[level].cost > state.gold) level--;
    if (empty === undefined && level < 2) return; // save up instead of buying weak archers
    if (B.archerLevels[level].cost > state.gold) return;
    const column = freeColumn(state, lane); if (column === null) return;
    select(level); click(lane, column);
  }
};

const B = (() => { const w = {}; vm.runInContext(fs.readFileSync(path.join(__dirname, 'balance.js'), 'utf8'), vm.createContext({ window: w })); return w.GAME_BALANCE; })();
console.log('Bot results: W(lives left) or L@wave, archers lost, gate leaks per wave');
for (const [di, d] of B.difficulties.entries()) {
  console.log(`\n${d.name}`);
  for (const name of Object.keys(bots)) {
    const row = B.locations.map((l, li) => { const r = play(li, di, bots[name]); return (r.won ? `W(${r.lives})` : `L@${r.wave}`).padEnd(6) + ` −${r.lostArchers}🏹 ` + `leaks ${r.leaks.join('')}`; });
    console.log(`  ${name.padEnd(9)} ${row.join(' | ')}`);
  }
}
