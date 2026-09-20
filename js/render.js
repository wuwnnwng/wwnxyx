const { ITEMS } = require('./config')
const { withAlpha, clamp, lerp } = require('./utils')

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function fillEllipse(ctx, x, y, rx, ry, rot) {
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  ctx.scale(rx, ry)
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const BIRD_PALETTE = [
  { color: '#E07A5F', deep: '#C45C42', wing: '#F2A488' },
  { color: '#81B29A', deep: '#5E8C76', wing: '#A7D4C0' },
  { color: '#7EB6D9', deep: '#5A93B8', wing: '#B5D8EE' },
  { color: '#E9C46A', deep: '#C9A24A', wing: '#F6DEA0' },
  { color: '#3D405B', deep: '#2B2D42', wing: '#6C6F8A' },
  { color: '#F2CC8F', deep: '#D4A86A', wing: '#FFE8BE' }
]

const BG_BIRDS = [
  { px: 0.14, py: 0.20, s: 1.15, pal: 0, face: 1, spd: 0.55, flap: 7.2, drift: 22 },
  { px: 0.86, py: 0.17, s: 0.95, pal: 2, face: -1, spd: 0.42, flap: 8.1, drift: 18 },
  { px: 0.08, py: 0.46, s: 1.35, pal: 1, face: 1, spd: 0.33, flap: 6.4, drift: 14 },
  { px: 0.92, py: 0.42, s: 1.20, pal: 3, face: -1, spd: 0.48, flap: 7.6, drift: 16 },
  { px: 0.22, py: 0.78, s: 1.05, pal: 5, face: 1, spd: 0.38, flap: 6.8, drift: 20 },
  { px: 0.78, py: 0.74, s: 1.28, pal: 0, face: -1, spd: 0.51, flap: 7.9, drift: 15 },
  { px: 0.50, py: 0.12, s: 0.72, pal: 2, face: 1, spd: 0.62, flap: 9.0, drift: 28 },
  { px: 0.62, py: 0.88, s: 0.88, pal: 1, face: -1, spd: 0.29, flap: 6.2, drift: 12 }
]

function drawCartoonBird(ctx, b) {
  const flap = Math.sin(b.flap)
  ctx.save()
  ctx.translate(b.x, b.y)
  ctx.rotate(b.rot || 0)
  ctx.scale((b.scale || 1) * (b.face || 1), b.scale || 1)
  ctx.globalAlpha = b.alpha == null ? 1 : b.alpha

  ctx.fillStyle = b.deep
  ctx.beginPath()
  ctx.moveTo(-16, 2)
  ctx.quadraticCurveTo(-28, -10 + flap * 6, -24, 12)
  ctx.quadraticCurveTo(-14, 8, -10, 4)
  ctx.closePath()
  ctx.fill()

  ctx.save()
  ctx.rotate(-0.55 + flap * 0.85)
  ctx.fillStyle = b.wing
  fillEllipse(ctx, -4, -4, 16, 7, 0.15)
  ctx.fillStyle = b.deep
  fillEllipse(ctx, -6, -4, 8, 3.2, 0.15)
  ctx.restore()

  ctx.fillStyle = b.color
  fillEllipse(ctx, 0, 3, 16, 13, 0)
  ctx.fillStyle = '#FFFBF5'
  fillEllipse(ctx, 3, 7, 9, 7, 0)

  ctx.save()
  ctx.rotate(0.2 - flap * 0.95)
  ctx.fillStyle = b.wing
  fillEllipse(ctx, 2, 1, 17, 7.5, 0)
  ctx.fillStyle = 'rgba(255,251,245,0.35)'
  fillEllipse(ctx, 4, 0, 10, 3.4, 0)
  ctx.restore()

  ctx.fillStyle = b.color
  fillEllipse(ctx, 11, -8, 11, 10, 0)
  ctx.fillStyle = 'rgba(224,122,95,0.38)'
  fillEllipse(ctx, 15, -5, 3.2, 2.2, 0)

  ctx.fillStyle = '#2B2D42'
  ctx.beginPath()
  ctx.arc(14, -10, 2.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(14.8, -10.8, 0.85, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#E9C46A'
  ctx.beginPath()
  ctx.moveTo(21, -9)
  ctx.lineTo(30, -6.5)
  ctx.lineTo(21, -3.5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#C9A24A'
  ctx.beginPath()
  ctx.moveTo(21, -6.4)
  ctx.lineTo(27, -6.5)
  ctx.lineTo(21, -3.8)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function drawBirdSilhouette(ctx, x, y, s, a) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.globalAlpha = a
  ctx.strokeStyle = '#3D405B'
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-10, 0)
  ctx.quadraticCurveTo(-4, -6, 0, 0)
  ctx.quadraticCurveTo(4, -6, 10, 0)
  ctx.stroke()
  ctx.restore()
}

function drawCloud(ctx, x, y, s, a) {
  ctx.save()
  ctx.globalAlpha = a
  ctx.fillStyle = '#FFFBF5'
  fillEllipse(ctx, x, y, 38 * s, 16 * s, 0)
  fillEllipse(ctx, x - 22 * s, y + 4 * s, 22 * s, 12 * s, 0)
  fillEllipse(ctx, x + 24 * s, y + 3 * s, 24 * s, 13 * s, 0)
  ctx.restore()
}

function drawBackground(ctx, env, t) {
  const w = env.width
  const h = env.height
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#A8D4F0')
  g.addColorStop(0.28, '#D4EBF8')
  g.addColorStop(0.62, '#F4EBDD')
  g.addColorStop(1, '#E9D7C4')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#7EB6D9'
  fillEllipse(ctx, w * 0.18, 108 + Math.sin(t * 0.35) * 6, 92, 58, 0)
  ctx.fillStyle = '#E07A5F'
  fillEllipse(ctx, w * 0.88, 168, 70, 48, 0)
  ctx.fillStyle = '#F2CC8F'
  fillEllipse(ctx, w * 0.72, h * 0.68, 100, 70, 0)
  ctx.restore()

  drawCloud(ctx, w * 0.22 + Math.sin(t * 0.12) * 10, 86, 1.05, 0.42)
  drawCloud(ctx, w * 0.78 + Math.cos(t * 0.1) * 12, 132, 0.92, 0.34)
  drawCloud(ctx, w * 0.52, h * 0.58 + Math.sin(t * 0.16) * 8, 1.2, 0.18)

  drawBirdSilhouette(ctx, w * 0.30, 70 + Math.sin(t * 0.5) * 4, 1.1, 0.16)
  drawBirdSilhouette(ctx, w * 0.38, 58 + Math.cos(t * 0.4) * 3, 0.75, 0.12)
  drawBirdSilhouette(ctx, w * 0.70, 96 + Math.sin(t * 0.45 + 1) * 5, 0.95, 0.14)
  drawBirdSilhouette(ctx, w * 0.78, 84, 0.62, 0.10)

  const markPal = BIRD_PALETTE[0]
  drawCartoonBird(ctx, {
    x: w * 0.5,
    y: h * 0.42 + Math.sin(t * 0.35) * 6,
    scale: Math.min(w, h) / 52,
    face: 1,
    flap: t * 2.2,
    rot: Math.sin(t * 0.25) * 0.04,
    color: markPal.color,
    deep: markPal.deep,
    wing: markPal.wing,
    alpha: 0.10
  })

  for (let i = 0; i < BG_BIRDS.length; i++) {
    const spec = BG_BIRDS[i]
    const pal = BIRD_PALETTE[spec.pal]
    drawCartoonBird(ctx, {
      x: w * spec.px + Math.sin(t * spec.spd + i) * spec.drift,
      y: h * spec.py + Math.cos(t * spec.spd * 0.8 + i * 0.7) * (spec.drift * 0.45),
      scale: spec.s,
      face: spec.face,
      flap: t * spec.flap + i,
      rot: Math.sin(t * spec.spd + i) * 0.08,
      color: pal.color,
      deep: pal.deep,
      wing: pal.wing,
      alpha: 0.38
    })
  }
}

function drawItemIcon(ctx, key, cx, cy, s, color, deep) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  if (key === 'cup') {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-10, -8)
    ctx.lineTo(10, -8)
    ctx.lineTo(7, 12)
    ctx.quadraticCurveTo(0, 16, -7, 12)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = deep
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(10, 0, 6, -Math.PI * 0.4, Math.PI * 0.5, false)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(-8, -8, 16, 3)
  } else if (key === 'book') {
    ctx.fillStyle = deep
    roundRect(ctx, -12, -12, 24, 24, 2)
    ctx.fill()
    ctx.fillStyle = color
    roundRect(ctx, -9, -12, 21, 24, 2)
    ctx.fill()
    ctx.fillStyle = '#F6F0E8'
    roundRect(ctx, -6, -9, 15, 18, 1)
    ctx.fill()
    ctx.strokeStyle = deep
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-6, -3)
    ctx.lineTo(7, -3)
    ctx.moveTo(-6, 2)
    ctx.lineTo(7, 2)
    ctx.stroke()
  } else if (key === 'scissors') {
    ctx.strokeStyle = deep
    ctx.fillStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(-7, 8, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(7, 8, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-5, 4)
    ctx.lineTo(8, -12)
    ctx.moveTo(5, 4)
    ctx.lineTo(-8, -12)
    ctx.stroke()
  } else if (key === 'key') {
    ctx.fillStyle = color
    ctx.strokeStyle = deep
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(-6, -6, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-1, -1)
    ctx.lineTo(12, 10)
    ctx.moveTo(6, 5)
    ctx.lineTo(10, 2)
    ctx.moveTo(9, 8)
    ctx.lineTo(13, 5)
    ctx.stroke()
  } else if (key === 'pot') {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-11, 0)
    ctx.lineTo(11, 0)
    ctx.lineTo(8, 13)
    ctx.lineTo(-8, 13)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#81B29A'
    fillEllipse(ctx, -4, -6, 5, 8, -0.4)
    fillEllipse(ctx, 4, -7, 5, 9, 0.35)
    ctx.fillStyle = deep
    ctx.fillRect(-12, -1, 24, 3)
  } else if (key === 'towel') {
    ctx.fillStyle = color
    roundRect(ctx, -12, -10, 24, 20, 4)
    ctx.fill()
    ctx.fillStyle = withAlpha('#fff', 0.35)
    roundRect(ctx, -8, -10, 16, 20, 3)
    ctx.fill()
    ctx.strokeStyle = deep
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-8, -4)
    ctx.lineTo(8, -4)
    ctx.moveTo(-8, 2)
    ctx.lineTo(8, 2)
    ctx.stroke()
  } else if (key === 'clock') {
    ctx.fillStyle = '#F6F0E8'
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 0, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = deep
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -7)
    ctx.moveTo(0, 0)
    ctx.lineTo(6, 3)
    ctx.stroke()
  } else if (key === 'lamp') {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-11, -4)
    ctx.lineTo(11, -4)
    ctx.lineTo(6, -14)
    ctx.lineTo(-6, -14)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = deep
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -4)
    ctx.lineTo(0, 10)
    ctx.stroke()
    ctx.fillStyle = deep
    ctx.fillRect(-7, 10, 14, 3)
  } else if (key === 'bottle') {
    ctx.fillStyle = color
    roundRect(ctx, -4, -14, 8, 7, 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-8, -7)
    ctx.lineTo(8, -7)
    ctx.lineTo(7, 14)
    ctx.quadraticCurveTo(0, 17, -7, 14)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = withAlpha('#fff', 0.3)
    ctx.fillRect(-6, -2, 4, 10)
  } else if (key === 'spoon') {
    ctx.fillStyle = color
    fillEllipse(ctx, 0, -8, 7, 9, 0)
    ctx.strokeStyle = deep
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, 14)
    ctx.stroke()
  }
  ctx.restore()
}

function drawCard(ctx, card, opt) {
  const o = opt || {}
  const shakeX = card.shake > 0 ? Math.sin(card.shake * 40) * 3 : 0
  const x = card.x + shakeX
  const y = card.y
  const w = card.w
  const h = card.h
  const item = ITEMS[card.type] || ITEMS[0]
  const scale = card.scale || 1
  const cx = x + w / 2
  const cy = y + h / 2

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  ctx.translate(-cx, -cy)

  ctx.shadowColor = o.lift ? 'rgba(61,64,91,0.38)' : 'rgba(61,64,91,0.18)'
  ctx.shadowBlur = o.lift ? 22 : 10
  ctx.shadowOffsetY = o.lift ? 12 : 3
  roundRect(ctx, x, y, w, h, 10)
  ctx.fillStyle = card.advanced ? '#FFF6D8' : '#FFFBF5'
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  ctx.lineWidth = card.advanced ? 2.4 : 1.2
  ctx.strokeStyle = card.advanced ? '#E9C46A' : withAlpha(item.color, 0.55)
  ctx.stroke()

  ctx.fillStyle = item.color
  roundRect(ctx, x + 1, y + 1, w - 2, 8, 8)
  ctx.fill()
  ctx.fillRect(x + 1, y + 6, w - 2, 4)

  const iconS = Math.min(w, h) / 38
  drawItemIcon(ctx, item.key, x + w / 2, y + h / 2 + 4, iconS, item.color, item.deep)

  if (card.advanced) {
    ctx.fillStyle = '#E9C46A'
    ctx.font = w < 46 ? 'bold 9px sans-serif' : 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(w < 46 ? '爆' : '高级·爆', x + w / 2, y + h - 5)
    burstBadge(ctx, x + w - 11, y + 16, 6, '#E9C46A')
  }

  if (o.covered) {
    roundRect(ctx, x, y, w, h, 10)
    ctx.fillStyle = 'rgba(45, 42, 38, 0.28)'
    ctx.fill()
  }

  if (card.locked) {
    roundRect(ctx, x, y, w, h, 10)
    ctx.fillStyle = 'rgba(61, 64, 91, 0.45)'
    ctx.fill()
    drawLockIcon(ctx, x + w / 2, y + h / 2 - 4, 1)
    ctx.fillStyle = '#FFFBF5'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(String(Math.max(0, card.lockHp)), x + w / 2, y + h / 2 + 10)
  }

  if (o.selected) {
    ctx.lineWidth = 3
    ctx.strokeStyle = '#E07A5F'
    roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 12)
    ctx.stroke()
  }

  if (o.hint) {
    ctx.lineWidth = 3
    ctx.strokeStyle = withAlpha('#81B29A', 0.4 + 0.6 * (o.hintPulse || 1))
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 12)
    ctx.stroke()
  }

  if (card.glow > 0) {
    roundRect(ctx, x, y, w, h, 10)
    ctx.fillStyle = withAlpha('#F2CC8F', card.glow * 0.35)
    ctx.fill()
  }

  ctx.restore()
}

function star(ctx, x, y, r, color) {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5
    const b = a + Math.PI / 5
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    ctx.lineTo(x + Math.cos(b) * r * 0.45, y + Math.sin(b) * r * 0.45)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function burstBadge(ctx, x, y, r, color) {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4
    const rr = i % 2 === 0 ? r : r * 0.45
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawLockIcon(ctx, x, y, s) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.strokeStyle = '#FFFBF5'
  ctx.fillStyle = '#FFFBF5'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.arc(0, -6, 6, Math.PI, 0)
  ctx.stroke()
  roundRect(ctx, -8, -6, 16, 14, 3)
  ctx.fill()
  ctx.restore()
}

function drawFeather(ctx, x, y, rot, s, color) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(s, s)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, -16)
  ctx.quadraticCurveTo(7, -2, 1, 14)
  ctx.quadraticCurveTo(-7, -2, 0, -16)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,251,245,0.4)'
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.moveTo(0, -12)
  ctx.lineTo(0, 10)
  ctx.stroke()
  ctx.restore()
}

function drawSlot(ctx, rect, filled, highlight, index) {
  const x = rect.x
  const y = rect.y
  const w = rect.w
  const h = rect.h
  const cx = x + w / 2
  const cy = y + h / 2
  const rx = w / 2
  const ry = h / 2

  ctx.save()
  ctx.fillStyle = highlight ? '#C9A24A' : '#5A3A22'
  fillEllipse(ctx, cx, cy + 1, rx, ry, 0)

  ctx.fillStyle = highlight ? '#F6E3B8' : '#7A4E2E'
  fillEllipse(ctx, cx, cy, rx - 1.5, ry - 1.8, 0)

  ctx.fillStyle = filled
    ? (highlight ? 'rgba(233,196,106,0.28)' : 'rgba(62,42,24,0.55)')
    : (highlight ? 'rgba(255,251,245,0.55)' : 'rgba(92,58,32,0.55)')
  fillEllipse(ctx, cx, cy - 1, rx - 4, ry - 5, 0)

  if (!filled) {
    ctx.fillStyle = highlight ? 'rgba(92,58,32,0.45)' : 'rgba(255,236,210,0.55)'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String((index == null ? 0 : index) + 1), cx, cy)
  }
  ctx.restore()
}

function drawDockTray(ctx, tray) {
  const x = tray.x
  const y = tray.y
  const w = tray.w
  const h = tray.h
  const r = 26
  ctx.save()
  ctx.shadowColor = 'rgba(70,42,20,0.32)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 5
  roundRect(ctx, x, y, w, h, r)
  const body = ctx.createLinearGradient(x, y, x, y + h)
  body.addColorStop(0, '#A97848')
  body.addColorStop(0.45, '#7A4E2E')
  body.addColorStop(1, '#4E2F1A')
  ctx.fillStyle = body
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.clip()
  const twigs = ['#5C3A1E', '#8A5A32', '#C4A574', '#6B4226', '#A67C52', '#3E2414']
  ctx.lineCap = 'round'
  for (let i = 0; i < 22; i++) {
    const yy = y + 5 + ((i * 13) % (h - 8))
    ctx.strokeStyle = twigs[i % twigs.length]
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 2 + (i % 3)
    ctx.beginPath()
    ctx.moveTo(x + 4, yy)
    ctx.bezierCurveTo(
      x + w * 0.28, yy - 9 + (i % 3) * 6,
      x + w * 0.72, yy + 10 - (i % 4) * 5,
      x + w - 4, yy + (i % 5) - 2
    )
    ctx.stroke()
  }
  for (let i = 0; i < 10; i++) {
    const xx = x + 12 + (w - 24) * (i / 9)
    ctx.strokeStyle = twigs[(i + 3) % twigs.length]
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(xx, y + 3)
    ctx.quadraticCurveTo(xx + (i % 2 ? 10 : -10), y + h * 0.5, xx + (i % 3 - 1) * 8, y + h - 3)
    ctx.stroke()
  }
  ctx.restore()

  roundRect(ctx, x + 7, y + 7, w - 14, h - 14, 20)
  ctx.fillStyle = 'rgba(62,42,24,0.28)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(233,196,106,0.28)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  ctx.strokeStyle = 'rgba(196,165,116,0.55)'
  ctx.lineWidth = 3
  roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, r - 1)
  ctx.stroke()

  drawFeather(ctx, x + 16, y + 10, -0.7, 0.85, '#E07A5F')
  drawFeather(ctx, x + w - 18, y + 12, 0.65, 0.8, '#81B29A')
  drawFeather(ctx, x + 28, y + h - 8, -2.4, 0.7, '#F2CC8F')
  ctx.restore()
}

function drawToolBranch(ctx, x, y, w) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#5C3A1E'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(x + 4, y)
  ctx.quadraticCurveTo(x + w * 0.5, y + 8, x + w - 4, y - 1)
  ctx.stroke()
  ctx.strokeStyle = '#A67C52'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(x + 8, y - 1)
  ctx.quadraticCurveTo(x + w * 0.5, y + 4, x + w - 8, y - 2)
  ctx.stroke()
  ctx.restore()
}

function drawBirdToolButton(ctx, btn, pressed, t) {
  const y = btn.y + (pressed ? 2 : 0)
  const x = btn.x
  const w = btn.w
  const h = btn.h
  const pal = btn.pal || BIRD_PALETTE[0]
  ctx.save()
  ctx.shadowColor = 'rgba(70,42,20,0.24)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 3
  roundRect(ctx, x, y, w, h, 18)
  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, '#FFFBF3')
  g.addColorStop(0.55, '#F6E4C8')
  g.addColorStop(1, pal.wing)
  ctx.fillStyle = g
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = pressed ? pal.deep : 'rgba(201,162,74,0.75)'
  ctx.lineWidth = pressed ? 2 : 1.5
  ctx.stroke()

  roundRect(ctx, x + 4, y + 4, w - 8, 28, 12)
  ctx.fillStyle = 'rgba(255,251,245,0.35)'
  ctx.fill()

  drawCartoonBird(ctx, {
    x: x + w / 2,
    y: y + 18,
    scale: 0.5,
    face: btn.face || 1,
    flap: (t || 0) * (btn.flap || 7) + (pressed ? 1.6 : 0),
    rot: pressed ? 0.12 : Math.sin((t || 0) * 2.2 + x) * 0.06,
    color: pal.color,
    deep: pal.deep,
    wing: pal.wing,
    alpha: 1
  })

  ctx.fillStyle = '#5C3A1E'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(btn.label, x + w / 2, y + h - 11)
  ctx.restore()
}

function drawButton(ctx, btn, pressed) {
  const y = btn.y + (pressed ? 1 : 0)
  roundRect(ctx, btn.x, y, btn.w, btn.h, btn.radius || 16)
  ctx.fillStyle = btn.bg || '#E07A5F'
  ctx.fill()
  if (btn.border) {
    ctx.strokeStyle = btn.border
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
  ctx.fillStyle = btn.color || '#fff'
  ctx.font = (btn.font || 'bold 16px sans-serif')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(btn.label, btn.x + btn.w / 2, y + btn.h / 2 + 1)
}

function hitButton(btn, x, y) {
  return x >= btn.x && y >= btn.y && x <= btn.x + btn.w && y <= btn.y + btn.h
}

class Particles {
  constructor() {
    this.list = []
  }
  burst(x, y, color, n) {
    for (let i = 0; i < (n || 12); i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 40 + Math.random() * 120
      this.list.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        life: 0.5 + Math.random() * 0.4,
        t: 0,
        r: 2 + Math.random() * 3,
        color: color
      })
    }
  }
  sparkle(x, y, color) {
    this.list.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 24,
      vy: -18 - Math.random() * 36,
      life: 0.7 + Math.random() * 0.7,
      t: 0,
      r: 1.2 + Math.random() * 1.8,
      color: color || '#F2CC8F'
    })
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]
      p.t += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 180 * dt
      if (p.t >= p.life) this.list.splice(i, 1)
    }
  }
  draw(ctx) {
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i]
      ctx.globalAlpha = 1 - p.t / p.life
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

module.exports = {
  roundRect: roundRect,
  drawBackground: drawBackground,
  drawItemIcon: drawItemIcon,
  drawCard: drawCard,
  drawSlot: drawSlot,
  drawDockTray: drawDockTray,
  drawButton: drawButton,
  drawBirdToolButton: drawBirdToolButton,
  drawToolBranch: drawToolBranch,
  hitButton: hitButton,
  Particles: Particles,
  star: star,
  fillEllipse: fillEllipse,
  lerp: lerp,
  clamp: clamp,
  drawCartoonBird: drawCartoonBird,
  BIRD_PALETTE: BIRD_PALETTE
}
