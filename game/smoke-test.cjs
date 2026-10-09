// Run with: node game/smoke-test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = __dirname;
const elements = new Map();
let frame;
let now = 0;
const noop = () => {};

function element(id = '') {
  const classes = new Set();
  return {
    id, width: 1672, height: 941, children: [], listeners: {}, textContent: '',
    classList: { add: x => classes.add(x), remove: x => classes.delete(x), toggle: (x, on) => on ? classes.add(x) : classes.delete(x), contains: x => classes.has(x) },
    set innerHTML(value) { this._html = value; this.children = []; },
    get innerHTML() { return this._html || ''; },
    append(child) { this.children.push(child); },
    addEventListener(name, fn) { this.listeners[name] = fn; },
    setAttribute: noop,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1672, height: 941 }),
    getContext: () => new Proxy({}, { get: () => noop })
  };
}
const document = {
  getElementById(id) { if (!elements.has(id)) elements.set(id, element(id)); return elements.get(id); },
  createElement() { return element(); }
};
const window = { addEventListener: noop };
class Image { constructor() { this.complete = true; this.naturalWidth = 1810; } set src(value) { this._src = value; assert.ok(fs.existsSync(path.resolve(root, value)), `Missing asset ${value}`); } }
const context = vm.createContext({ window, document, Image, performance: { now: () => now }, requestAnimationFrame: fn => { frame = fn; }, Math, console });
vm.runInContext(fs.readFileSync(path.join(root, 'balance.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'game.js'), 'utf8'), context);

assert.equal(elements.get('location-list').children.length, 4);
assert.equal(elements.get('archer-cards').children.length, 4);
elements.get('start-button').listeners.click();
assert.equal(Number(elements.get('gold-value').textContent), 250);
elements.get('board').listeners.pointerdown({ clientX: 335, clientY: 226 });
assert.equal(Number(elements.get('gold-value').textContent), 185);
elements.get('board').listeners.pointerdown({ clientX: 335, clientY: 226 });
assert.equal(Number(elements.get('gold-value').textContent), 185, 'Occupied cell must not charge gold');
for (let i = 0; i < 600; i++) { now += 16.67; frame(now); }
assert.ok(Number(elements.get('gold-value').textContent) > 185, 'Passive income should accrue');
elements.get('pause-button').listeners.click();
const pausedGold = elements.get('gold-value').textContent;
for (let i = 0; i < 300; i++) { now += 16.67; frame(now); }
assert.equal(elements.get('gold-value').textContent, pausedGold, 'Pause should freeze income');
elements.get('modal-actions').children[0].listeners.click();
for (let i = 0; i < 900; i++) { now += 16.67; frame(now); }
assert.ok(Number(elements.get('gold-value').textContent) > 329, 'Archer should defeat the first orc and earn a kill reward');
console.log('Smoke test passed: assets, menu, placement, income, pause, first combat.');
