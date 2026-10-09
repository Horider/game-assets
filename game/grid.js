// Tile footprints are traced against the painted 1672 × 941 backgrounds by
// fitting the visible seams between tiles. Rows nearer the viewer are wider,
// so every row has its own left edge and tile width (`step`). `minX` is the
// painted field edge where scenery cuts off the first tile of a row.
// Forest and marsh fan out around their middle column the same way, so all
// four maps share one perspective feel.
window.GAME_GRIDS = Object.freeze({
  forest: {
    columns: 9, left: [251.3, 239.6, 228.4, 217.1, 205.4], step: [140.6, 143.2, 145.7, 148.2, 150.8],
    rows: [[183, 279], [300, 397], [418, 520], [537, 645], [658, 786]]
  },
  cemetery: {
    columns: 7, left: [161, 146, 129, 113, 98], step: [192.7, 197.5, 202.3, 207, 211.3],
    minX: [161, 146, 132, 122, 112],
    rows: [[216, 301], [329, 422], [451, 549], [579, 681], [715, 817]]
  },
  marsh: {
    columns: 7, left: [246.5, 231, 215.7, 200.3, 184.9], step: [167.3, 171.7, 176.1, 180.5, 184.9],
    rows: [[184, 269], [303, 396], [431, 526], [556, 653], [691, 789]]
  },
  frost: {
    columns: 8, left: [186, 158, 133, 111, 81], step: [163.8, 170.8, 177.4, 183.1, 190.5],
    minX: [186, 170, 158, 147, 137],
    rows: [[229, 322], [335, 432], [444, 548], [557, 670], [681, 786]]
  }
});
