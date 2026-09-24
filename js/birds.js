const { fillEllipse, drawCartoonBird, BIRD_PALETTE } = require('./render')
const { clamp, pick } = require('./utils')

class BirdIntroScene {
  constructor(app) {
    this.app = app
    this.birds = []
    this.t = 0
    this.done = false
    this.pending = null
    this.skyK = 0
  }

  start(mode, level) {
    this.pending = { mode: mode, level: level }
    this.t = 0
    this.done = false
    this.skyK = 0
    this.birds = []
    const env = this.app.env
    const cols = 8
    const rows = 8
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pal = pick(BIRD_PALETTE)
        const delay = r * 0.09 + Math.random() * 0.08
        const scale = 0.5 + Math.random() * 1.05
        this.birds.push({
          x: ((c + 0.15 + Math.random() * 0.7) / cols) * env.width,
          y: env.height + 40 + r * 52 + Math.random() * 24,
          vx: (Math.random() - 0.5) * 80,
          vy: -(300 + Math.random() * 160),
          wobble: 16 + Math.random() * 26,
          phase: Math.random() * Math.PI * 2,
          flap: Math.random() * Math.PI * 2,
          flapSpeed: 10 + Math.random() * 8,
          scale: scale,
          face: Math.random() < 0.55 ? 1 : -1,
          rot: (Math.random() - 0.5) * 0.18,
          color: pal.color,
          deep: pal.deep,
          wing: pal.wing,
          alpha: 1,
          delay: delay,
          born: false
        })
      }
    }
    this.birds.sort(function (a, b) { return a.scale - b.scale })
  }

  finish() {
    if (this.done) return
    this.done = true
    const p = this.pending
    this.pending = null
    if (p) this.app.enterPlay(p.mode, p.level)
  }

  update(dt) {
    this.t += dt
    this.skyK = clamp(this.t / 0.22, 0, 1)
    const env = this.app.env
    let flying = 0
    let waiting = 0
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i]
      if (this.t < b.delay) {
        waiting++
        continue
      }
      b.born = true
      b.flap += b.flapSpeed * dt
      b.phase += dt * 3.2
      b.x += (b.vx + Math.sin(b.phase) * b.wobble) * dt
      b.y += b.vy * dt
      b.rot = clamp(-b.vx / 420 + Math.sin(b.phase * 0.7) * 0.08, -0.35, 0.35)
      if (b.x < -40) b.x = env.width + 20
      if (b.x > env.width + 40) b.x = -20
      if (b.y > -70) flying++
    }
    if (this.t > 0.9 && waiting === 0 && flying === 0) this.finish()
    if (this.t > 3.2) this.finish()
  }

  draw(ctx) {
    const env = this.app.env
    this.app.home.draw(ctx)
    ctx.save()
    ctx.globalAlpha = this.skyK
    const g = ctx.createLinearGradient(0, 0, 0, env.height)
    g.addColorStop(0, '#8EC8EA')
    g.addColorStop(0.45, '#C9E6F5')
    g.addColorStop(1, '#F7F0E6')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, env.width, env.height)
    ctx.globalAlpha = this.skyK * 0.35
    ctx.fillStyle = '#FFFBF5'
    fillEllipse(ctx, env.width * 0.22, 90, 46, 22, 0)
    fillEllipse(ctx, env.width * 0.3, 90, 28, 16, 0)
    fillEllipse(ctx, env.width * 0.78, 150, 52, 24, 0)
    fillEllipse(ctx, env.width * 0.86, 150, 30, 16, 0)
    ctx.restore()

    for (let i = 0; i < this.birds.length; i++) {
      if (this.birds[i].born) drawCartoonBird(ctx, this.birds[i])
    }

    if (this.t > 0.35 && this.t < 2.4) {
      ctx.globalAlpha = 0.55 + Math.sin(this.t * 6) * 0.15
      ctx.fillStyle = '#3D405B'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('点击跳过', env.width / 2, env.height - Math.max(env.safeBottom + 28, 56))
      ctx.globalAlpha = 1
    }
  }

  onTouchStart() {}

  onTouchEnd() {
    if (this.t > 0.28) this.finish()
  }
}

module.exports = BirdIntroScene
