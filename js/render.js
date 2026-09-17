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

function drawBackground(ctx, env, t) {
  const w = env.width
  const h = env.height
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#F7F0E6')
  g.addColorStop(0.55, '#F3E6D6')
  g.addColorStop(1, '#E9D7C4')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.fillStyle = '#E07A5F'
  fillEllipse(ctx, w * 0.18, 120 + Math.sin(t * 0.4) * 8, 90, 70, 0)
  ctx.fillStyle = '#81B29A'
  fillEllipse(ctx, w * 0.86, 220, 70, 55, 0)
  ctx.fillStyle = '#F2CC8F'
  fillEllipse(ctx, w * 0.7, h * 0.62, 110, 86, 0)
  ctx.fillStyle = '#7EB6D9'
  fillEllipse(ctx, w * 0.12, h * 0.7, 80, 62, 0)
  ctx.restore()
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

  ctx.shadowColor = 'rgba(61,64,91,0.18)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 3
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
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('高级', x + w / 2, y + h - 6)
    star(ctx, x + w - 12, y + 16, 5, '#E9C46A')
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

function drawSlot(ctx, rect, filled, highlight) {
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8)
  ctx.fillStyle = highlight ? 'rgba(224,122,95,0.22)' : (filled ? 'rgba(255,251,245,0.18)' : 'rgba(255,251,245,0.55)')
  ctx.fill()
  ctx.strokeStyle = highlight ? '#E07A5F' : '#CABCAB'
  ctx.lineWidth = highlight ? 2 : 1.2
  try { ctx.setLineDash(filled ? [] : [4, 3]) } catch (e) {}
  ctx.stroke()
  try { ctx.setLineDash([]) } catch (e) {}
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

function drawBannerPlaceholder(ctx, env) {
  const y = env.height - env.bannerH
  ctx.fillStyle = '#E7DCCE'
  ctx.fillRect(0, y, env.width, env.bannerH)
  ctx.fillStyle = '#9A8E82'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Banner 广告位', env.width / 2, y + env.bannerH / 2 - 8)
  ctx.font = '11px sans-serif'
  ctx.fillText('请在 js/config.js 填写流量主广告 ID', env.width / 2, y + env.bannerH / 2 + 10)
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
  drawButton: drawButton,
  hitButton: hitButton,
  drawBannerPlaceholder: drawBannerPlaceholder,
  Particles: Particles,
  star: star,
  fillEllipse: fillEllipse,
  lerp: lerp,
  clamp: clamp
}
