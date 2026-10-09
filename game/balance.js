// All gameplay numbers for the first playable version live here.
window.GAME_BALANCE = Object.freeze({
  startingGold: 250,
  passiveGold: 24,       // earned every interval
  goldInterval: 4,       // seconds
  killGold: 18,
  startingLives: 5,
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
    { level: 1, health: 90, speed: 31, damage: 20, attackInterval: 1.2, sprite: '../enemies/orcs-animated/orc-raider-level-1.png', body: [[79,326,178],[67,321,188],[78,322,177]] },
    { level: 2, health: 145, speed: 27, damage: 27, attackInterval: 1.15, sprite: '../enemies/orcs-animated/orc-raider-level-2.png', body: [[67,327,177],[66,323,189],[70,323,177]] },
    { level: 3, health: 220, speed: 24, damage: 34, attackInterval: 1.1, sprite: '../enemies/orcs-animated/orc-raider-level-3.png', body: [[69,330,179],[65,329,193],[72,327,177]] }
  ],
  waves: [
    { count: 5, interval: 4.0, enemyLevel: 1 },
    { count: 7, interval: 3.25, enemyLevel: 1 },
    { count: 8, interval: 2.9, enemyLevel: 2 },
    { count: 10, interval: 2.45, enemyLevel: 3 }
  ],
  betweenWaves: 5,
  firstWaveDelay: 7,
  locations: [
    { id: 'forest', name: 'Лесной форпост', subtitle: 'Сумеречная граница', image: '../locations/forest-outpost.png', enemyHealth: 1, reward: 1 },
    { id: 'cemetery', name: 'Старое кладбище', subtitle: 'Тропа среди руин', image: '../locations/ruined-cemetery.png', enemyHealth: 1.08, reward: 1.1 },
    { id: 'marsh', name: 'Болотная переправа', subtitle: 'Пять узких путей', image: '../locations/marsh-crossing.png', enemyHealth: 1.16, reward: 1.2 },
    { id: 'frost', name: 'Ледяной перевал', subtitle: 'Последний рубеж', image: '../locations/frost-pass.png', enemyHealth: 1.25, reward: 1.3 }
  ]
});
