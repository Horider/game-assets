// Tile footprints are traced against the painted 1672 × 941 backgrounds by
// fitting the visible seams between tiles. Rows nearer the viewer are wider,
// so every row has its own left edge and tile width (`step`). `minX` is the
// painted field edge where scenery cuts off the first tile of a row.
window.GAME_GRIDS = Object.freeze({
  forest: {
    columns: 9, left: [228, 228, 227, 225, 222], step: [145.7, 145.7, 145.7, 145.7, 145.7],
    rows: [[183, 279], [300, 397], [418, 520], [537, 645], [658, 786]]
  },
  cemetery: {
    columns: 7, left: [161, 146, 129, 113, 98], step: [192.7, 197.5, 202.3, 207, 211.3],
    minX: [161, 146, 132, 122, 112],
    rows: [[216, 301], [329, 422], [451, 549], [579, 681], [715, 817]]
  },
  marsh: {
    columns: 7, left: [220, 218, 216, 214, 212], step: [174.5, 175.3, 176.1, 176.9, 177.7],
    rows: [[184, 269], [303, 396], [431, 526], [556, 653], [691, 789]]
  },
  frost: {
    columns: 8, left: [186, 158, 133, 111, 81], step: [163.8, 170.8, 177.4, 183.1, 190.5],
    minX: [186, 170, 158, 147, 137],
    rows: [[229, 322], [335, 432], [444, 548], [557, 670], [681, 786]]
  }
});
