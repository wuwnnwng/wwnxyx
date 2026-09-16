function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3)
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rectsOverlapArea(a, b) {
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (x <= 0 || y <= 0) return 0
  return x * y
}

function pointInRect(x, y, r) {
  return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h
}

function inflate(r, pad) {
  return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }
}

function dist(ax, ay, bx, by) {
  const dx = ax - bx
  const dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  }
}

function withAlpha(hex, a) {
  const c = hexToRgb(hex)
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')'
}

function now() {
  return Date.now()
}

function formatScore(n) {
  return String(Math.max(0, n | 0))
}

module.exports = {
  clamp: clamp,
  lerp: lerp,
  easeOut: easeOut,
  easeInOut: easeInOut,
  randInt: randInt,
  shuffle: shuffle,
  pick: pick,
  rectsOverlapArea: rectsOverlapArea,
  pointInRect: pointInRect,
  inflate: inflate,
  dist: dist,
  hexToRgb: hexToRgb,
  withAlpha: withAlpha,
  now: now,
  formatScore: formatScore
}
