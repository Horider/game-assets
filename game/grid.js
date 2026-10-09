// Tile footprints are traced against the painted 1672 × 941 backgrounds.
// Each row may start farther left as the scenery widens toward the viewer.
window.GAME_GRIDS = Object.freeze({
  forest: {
    left: [209, 205, 201, 197, 193], step: 185, columns: 7,
    rows: [[183, 279], [300, 397], [418, 520], [537, 645], [658, 786]]
  },
  cemetery: {
    left: [153, 143, 132, 122, 112], step: 200, columns: 7,
    rows: [[216, 301], [329, 422], [451, 549], [579, 681], [715, 817]]
  },
  marsh: {
    left: [225, 225, 225, 225, 225], step: 172, columns: 7,
    rows: [[184, 269], [303, 396], [431, 526], [556, 653], [691, 789]]
  },
  frost: {
    left: [181, 170, 158, 147, 137], step: 165, columns: 8,
    rows: [[229, 322], [335, 432], [444, 548], [557, 670], [681, 786]]
  }
});
