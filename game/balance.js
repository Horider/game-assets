// All gameplay numbers for the first playable version live here.
window.GAME_BALANCE = Object.freeze({
  goldInterval: 4,       // seconds between passive income ticks
  waveBonus: 40,         // paid after each cleared wave
  lanes: 5,
  spawnX: 1590,
  gateX: 165,
  projectileSpeed: 675,
  projectileHitRadius: 38,
  // On-screen body height (hood/helmet to boots) every frame is scaled to,
  // so idle, run and attack poses keep exactly the same size. Each sprite's
  // `body` lists [top, foot, centerX] in source pixels for every sheet row.
  archerBodyHeight: 112,
  orcBodyHeight: 106,
  speeds: [1, 2, 3],
  upgradeCostFactor: 0.5, // share of the next level's price; one level per upgrade
  archerLevels: [
    { level: 1, name: 'Разведчик', cost: 65, attack: 22, health: 85, speed: 0.88, color: '#c7b588', sprite: '../characters/animated-v2/archer-level-1-style-matched-fixed.png', body: [[54,340,162],[50,337,167],[72,327,175]], arrow: '../characters/combat-assets-v1/archer-arrows-10/level-01.png' },
    { level: 2, name: 'Стрелок', cost: 100, attack: 34, health: 110, speed: 1.08, color: '#d4b977', sprite: '../characters/animated-v2/archer-level-2-style-matched.png', body: [[65,343,163],[71,346,170],[76,323,174]], arrow: '../characters/combat-assets-v1/archer-arrows-10/level-02.png' },
    { level: 3, name: 'Следопыт', cost: 145, attack: 48, health: 135, speed: 1.28, color: '#d9c797', sprite: '../characters/animated-v2/archer-level-3-style-matched-hand-fixed.png', body: [[74,340,166],[74,334,171],[71,305,179]], arrow: '../characters/combat-assets-v1/archer-arrows-10/level-03.png' },
    { level: 4, name: 'Мастер лука', cost: 200, attack: 65, health: 165, speed: 1.48, color: '#d5d4ae', sprite: '../characters/animated-v2/archer-level-4-style-matched-hand-fixed.png', body: [[76,341,169],[74,335,173],[76,306,183]], arrow: '../characters/combat-assets-v1/archer-arrows-10/level-04.png' }
  ],
  orcLevels: [
    { level: 1, name: 'Налётчик', health: 220, speed: 38, damage: 30, attackInterval: 1.2, reward: 14, badge: '#c9b98a', sprite: '../enemies/orcs-animated/orc-raider-level-1.png', body: [[79,326,178],[67,321,188],[78,322,177]] },
    { level: 2, name: 'Громила', health: 540, speed: 34, damage: 44, attackInterval: 1.15, reward: 28, badge: '#e0a24f', sprite: '../enemies/orcs-animated/orc-raider-level-2.png', body: [[67,327,177],[66,323,189],[70,323,177]] },
    { level: 3, name: 'Вожак', health: 1050, speed: 30, damage: 60, attackInterval: 1.1, reward: 50, badge: '#e0573f', sprite: '../enemies/orcs-animated/orc-raider-level-3.png', body: [[69,330,179],[65,329,193],[72,327,177]] }
  ],
  // Each wave lists [orc level, count]; levels are interleaved when spawning.
  waves: [
    { interval: 3.6, groups: [[1,  6]] },
    { interval: 3.0, groups: [[1,  8],  [2,  3]] },
    { interval: 2.4, groups: [[1,  5],  [2,  7],  [3,  3]] },
    { interval: 1.9, groups: [[1,  4],  [2,  8],  [3,  9]] }
  ],
  betweenWaves: 5,
  firstWaveDelay: 7,
  // Difficulty scales enemies and the economy on top of the location.
  difficulties: [
    { id: 'easy', name: 'Лёгкая', subtitle: 'Для знакомства', startingGold: 260, startingLives: 7, passiveGold: 12, enemyHealth: 0.75, enemyDamage: 0.85, enemySpeed: 0.95, reward: 1.1 },
    { id: 'normal', name: 'Обычная', subtitle: 'Нужна расстановка', startingGold: 210, startingLives: 5, passiveGold: 9, enemyHealth: 1, enemyDamage: 1, enemySpeed: 1, reward: 1 },
    { id: 'hard', name: 'Тяжёлая', subtitle: 'Каждая монета на счету', startingGold: 220, startingLives: 3, passiveGold: 8, enemyHealth: 1.1, enemyDamage: 1.15, enemySpeed: 1.05, reward: 0.9 }
  ],
  locations: [
    { id: 'forest', name: 'Лесной форпост', subtitle: 'Сумеречная граница', image: '../locations/forest-outpost.png', enemyHealth: 1, reward: 1 },
    { id: 'cemetery', name: 'Старое кладбище', subtitle: 'Тропа среди руин', image: '../locations/ruined-cemetery.png', enemyHealth: 1.08, reward: 1.1 },
    { id: 'marsh', name: 'Болотная переправа', subtitle: 'Пять узких путей', image: '../locations/marsh-crossing.png', enemyHealth: 1.16, reward: 1.2 },
    { id: 'frost', name: 'Ледяной перевал', subtitle: 'Последний рубеж', image: '../locations/frost-pass.png', enemyHealth: 1.25, reward: 1.3 }
  ]
});
