const { CONFIG, ITEMS } = require('./config')
const { roundRect, drawBackground, drawButton, hitButton, drawItemIcon, Particles, star, fillEllipse } = require('./render')
const audio = require('./audio')
const { loadJSON } = require('./env')
const { clamp, lerp, easeOutBack, withAlpha } = require('./utils')

class HomeScene {
  constructor(app) {
    this.app = app
    this.t = 0
    this.bootT = 0
    this.booting = true
    this.burstDone = false
    this.pressed = null
    this.help = false
    this.particles = new Particles()
    this.sparkleAcc = 0
  }

  enter() {
    this.t = 0
    this.bootT = 0
    this.booting = true
    this.burstDone = false
    this.pressed = null
    this.help = false
    this.particles.list = []
  }

  skipBoot() {
    this.booting = false
    this.bootT = 2.2
    this.burstDone = true
  }

  update(dt) {
    this.t += dt
    this.bootT += dt
    if (this.booting && this.bootT >= 2.15) this.booting = false

    const env = this.app.env
    if (!this.burstDone && this.bootT > 0.5) {
      this.burstDone = true
      const cx = env.width / 2
      const cy = env.safeTop + 190
      this.particles.burst(cx, cy, '#E07A5F', 26)
      this.particles.burst(cx, cy - 40, '#F2CC8F', 18)
      this.particles.burst(cx, cy + 10, '#81B29A', 12)
    }

    this.sparkleAcc += dt
    if (this.sparkleAcc > 0.07) {
      this.sparkleAcc = 0
      const colors = ['#F2CC8F', '#E07A5F', '#FFFBF5', '#81B29A']
      this.particles.sparkle(
        env.width * (0.12 + Math.random() * 0.76),
        env.safeTop + 30 + Math.random() * 210,
        colors[Math.floor(Math.random() * colors.length)]
      )
    }
    this.particles.update(dt)
  }

  layout() {
    const env = this.app.env
    const cx = env.width / 2
    const bw = Math.min(260, env.width - 72)
    const bh = 50
    const startY = env.height * 0.56
    return {
      level: { x: cx - bw / 2, y: startY, w: bw, h: bh, label: '闯关模式', bg: '#E07A5F', radius: 25 },
      endless: { x: cx - bw / 2, y: startY + 66, w: bw, h: bh, label: '无尽模式', bg: '#81B29A', radius: 25 },
      help: { x: cx - bw / 2, y: startY + 132, w: bw, h: 40, label: '玩法说明', bg: '#FFFBF5', color: '#3D405B', border: '#E6D9C8', radius: 20, font: 'bold 14px sans-serif' },
      sound: { x: 16, y: env.safeTop, w: 64, h: 28, label: audio.isSoundOn() ? '音效开' : '音效关', bg: 'rgba(61,64,91,0.1)', color: '#3D405B', radius: 14, font: '12px sans-serif' }
    }
  }

  draw(ctx) {
    const env = this.app.env
    drawBackground(ctx, env, this.t)
    this.drawAura(ctx, env)
    this.drawHeroCards(ctx, env)
    this.particles.draw(ctx)
    this.drawTitle(ctx, env)

    const L = this.layout()
    L.sound.label = audio.isSoundOn() ? '音效开' : '音效关'
    this.drawShinyButton(ctx, L.sound, this.pressed === 'sound', 0.2)
    this.drawShinyButton(ctx, L.level, this.pressed === 'level', 1.15)
    this.drawShinyButton(ctx, L.endless, this.pressed === 'endless', 1.32)
    this.drawShinyButton(ctx, L.help, this.pressed === 'help', 1.48)

    const infoK = clamp((this.bootT - 1.55) / 0.35, 0, 1)
    if (infoK > 0) {
      const level = loadJSON(CONFIG.storage.level, 1) || 1
      const best = loadJSON(CONFIG.storage.endlessBest, 0) || 0
      ctx.globalAlpha = infoK
      ctx.fillStyle = '#8A8178'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('已解锁第 ' + level + ' 关    无尽最高分 ' + best, env.width / 2, L.help.y + 64)
      ctx.globalAlpha = 1
    }

    if (this.booting && this.bootT > 0.35) {
      ctx.globalAlpha = 0.7 + Math.sin(this.t * 6) * 0.2
      ctx.fillStyle = '#8A8178'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('点击跳过', env.width / 2, env.height - 52)
      ctx.globalAlpha = 1
    }

    if (this.help) this.drawHelp(ctx, env)
  }

  drawAura(ctx, env) {
    const cx = env.width / 2
    const cy = env.safeTop + 188
    const grow = clamp(this.bootT / 0.7, 0, 1)
    ctx.save()
    for (let i = 0; i < 4; i++) {
      const r = (48 + i * 26 + Math.sin(this.t * 1.5 + i) * 5) * grow
      ctx.strokeStyle = withAlpha(i % 2 ? '#E07A5F' : '#F2CC8F', 0.16 - i * 0.03)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = withAlpha('#FFFBF5', 0.18)
    fillEllipse(ctx, cx, cy + 8, 70 * grow, 22 * grow, 0)
    ctx.restore()
  }

  drawTitle(ctx, env) {
    const chars = CONFIG.name.split('')
    const baseY = env.safeTop + 70
    const step = 36
    const left = env.width / 2 - (chars.length - 1) * step / 2
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < chars.length; i++) {
      const k = clamp((this.bootT - 0.18 - i * 0.08) / 0.42, 0, 1)
      const pop = easeOutBack(k)
      ctx.save()
      ctx.globalAlpha = k
      ctx.translate(left + i * step, baseY - (1 - pop) * 56)
      ctx.rotate((1 - pop) * (i % 2 ? 0.25 : -0.25))
      ctx.scale(pop, pop)
      ctx.shadowColor = 'rgba(224,122,95,0.55)'
      ctx.shadowBlur = 16 + Math.sin(this.t * 4 + i) * 8
      ctx.fillStyle = '#3D405B'
      ctx.font = 'bold 34px sans-serif'
      ctx.fillText(chars[i], 0, 0)
      ctx.restore()
    }

    const subK = clamp((this.bootT - 0.7) / 0.35, 0, 1)
    ctx.globalAlpha = subK
    ctx.shadowBlur = 0
    ctx.fillStyle = '#8A8178'
    ctx.font = '14px sans-serif'
    ctx.fillText('居家小物 · 二消堆叠', env.width / 2, env.safeTop + 108)
    ctx.globalAlpha = 1

    if (subK > 0.2) {
      const starGap = (chars.length - 1) * step / 2 + 38
      star(ctx, env.width / 2 - starGap, env.safeTop + 70, 5 + Math.sin(this.t * 5) * 1.2, '#E9C46A')
      star(ctx, env.width / 2 + starGap, env.safeTop + 78, 4 + Math.cos(this.t * 4) * 1, '#E07A5F')
    }
  }

  drawHeroCards(ctx, env) {
    const cx = env.width / 2
    const cy = env.safeTop + 196
    const pack = [0, 3, 4, 2, 1, 5]
    for (let i = 0; i < pack.length; i++) {
      const delay = 0.1 * i
      const k = clamp((this.bootT - 0.12 - delay) / 0.48, 0, 1)
      const pop = easeOutBack(k)
      const ang = -0.7 + i * 0.28
      const radius = 58
      const fx = cx + Math.sin(ang) * radius
      const fy = cy + Math.cos(ang) * 10 + Math.sin(this.t * 1.7 + i * 0.9) * 7
      const y = lerp(fy + 160, fy, pop)
      const rot = ang * 0.42 + Math.sin(this.t * 1.3 + i) * 0.05
      ctx.save()
      ctx.globalAlpha = Math.min(1, k * 1.1)
      this.miniCard(ctx, fx, y, rot, ITEMS[pack[i]], pop)
      ctx.restore()
    }
  }

  miniCard(ctx, x, y, rot, item, scale) {
    const s = scale == null ? 1 : scale
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(s, s)
    ctx.shadowColor = 'rgba(61,64,91,0.22)'
    ctx.shadowBlur = 16
    roundRect(ctx, -36, -44, 72, 88, 12)
    ctx.fillStyle = '#FFFBF5'
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = item.color
    roundRect(ctx, -35, -43, 70, 12, 10)
    ctx.fill()
    drawItemIcon(ctx, item.key, 0, 8, 1.55, item.color, item.deep)
    ctx.restore()
  }

  drawShinyButton(ctx, btn, pressed, delay) {
    const appear = clamp((this.bootT - delay) / 0.38, 0, 1)
    if (appear <= 0) return
    const pop = easeOutBack(appear)
    const b = {
      x: btn.x,
      y: btn.y + (1 - pop) * 28,
      w: btn.w,
      h: btn.h,
      label: btn.label,
      bg: btn.bg,
      color: btn.color,
      border: btn.border,
      radius: btn.radius,
      font: btn.font
    }
    ctx.save()
    ctx.globalAlpha = appear
    drawButton(ctx, b, pressed)
    const shineX = b.x + ((this.t * 110 + delay * 40) % (b.w + 90)) - 45
    ctx.beginPath()
    roundRect(ctx, b.x, b.y, b.w, b.h, b.radius || 24)
    ctx.clip()
    const g = ctx.createLinearGradient(shineX, b.y, shineX + 46, b.y)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.38)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(b.x, b.y, b.w, b.h)
    ctx.restore()
  }

  drawHelp(ctx, env) {
    ctx.fillStyle = 'rgba(35,31,28,0.5)'
    ctx.fillRect(0, 0, env.width, env.height)
    const pw = Math.min(330, env.width - 32)
    const ph = 490
    const px = (env.width - pw) / 2
    const py = (env.height - ph) / 2
    roundRect(ctx, px, py, pw, ph, 18)
    ctx.fillStyle = '#FFFBF5'
    ctx.fill()
    ctx.fillStyle = '#3D405B'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('怎么玩', env.width / 2, py + 36)

    const lines = [
      '只能点没有被上层压住的卡牌',
      '两张相同即可消除，不必凑三张',
      '点一下卡牌就会飞进底部鸟巢',
      '鸟巢里两张相同会自动消除',
      '金色高级牌是炸弹，对消会炸掉周围',
      '同时翻开 4 张同款普通牌也会合成高级牌',
      '达到本关目标分数即通关，不必清空',
      '锁块：消除相邻 2 张卡后解锁',
      '撤回可把刚放进鸟巢的卡退回原位',
      '移除会把鸟巢里的卡全部放回场上',
      '提示 / 洗牌 / 撤回 / 移除可直接使用'
    ]
    ctx.font = '13px sans-serif'
    ctx.fillStyle = '#5C574F'
    ctx.textAlign = 'left'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText((i + 1) + '. ' + lines[i], px + 22, py + 68 + i * 26)
    }
    drawButton(ctx, {
      x: env.width / 2 - 60, y: py + ph - 58, w: 120, h: 38,
      label: '知道了', bg: '#E07A5F', radius: 18
    }, false)
  }

  onTouchStart(x, y) {
    if (this.help) return
    if (this.booting) return
    const L = this.layout()
    if (hitButton(L.level, x, y)) this.pressed = 'level'
    else if (hitButton(L.endless, x, y)) this.pressed = 'endless'
    else if (hitButton(L.help, x, y)) this.pressed = 'help'
    else if (hitButton(L.sound, x, y)) this.pressed = 'sound'
  }

  onTouchEnd(x, y) {
    if (this.help) {
      this.help = false
      return
    }
    if (this.booting) {
      if (this.bootT > 0.35) this.skipBoot()
      return
    }
    const p = this.pressed
    this.pressed = null
    const L = this.layout()
    if (p === 'sound' && hitButton(L.sound, x, y)) {
      audio.toggleSound()
      return
    }
    if (p === 'help' && hitButton(L.help, x, y)) {
      this.help = true
      audio.tap()
      return
    }
    if (p === 'level' && hitButton(L.level, x, y)) {
      audio.tap()
      const level = loadJSON(CONFIG.storage.level, 1) || 1
      this.app.goPlay('level', level)
      return
    }
    if (p === 'endless' && hitButton(L.endless, x, y)) {
      audio.tap()
      this.app.goPlay('endless', 0)
    }
  }
}

module.exports = HomeScene
