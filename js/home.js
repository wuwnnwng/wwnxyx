const { CONFIG, ITEMS } = require('./config')
const { roundRect, drawBackground, drawButton, hitButton, drawItemIcon } = require('./render')
const audio = require('./audio')
const { loadJSON } = require('./env')

class HomeScene {
  constructor(app) {
    this.app = app
    this.t = 0
    this.pressed = null
    this.help = false
  }

  update(dt) {
    this.t += dt
  }

  layout() {
    const env = this.app.env
    const cx = env.width / 2
    const bw = Math.min(260, env.width - 72)
    const bh = 48
    const startY = env.height * 0.52
    return {
      level: { x: cx - bw / 2, y: startY, w: bw, h: bh, label: '闯关模式', bg: '#E07A5F', radius: 24 },
      endless: { x: cx - bw / 2, y: startY + 64, w: bw, h: bh, label: '无尽模式', bg: '#81B29A', radius: 24 },
      help: { x: cx - bw / 2, y: startY + 128, w: bw, h: 40, label: '玩法说明', bg: '#FFFBF5', color: '#3D405B', border: '#E6D9C8', radius: 20, font: 'bold 14px sans-serif' },
      sound: { x: 16, y: env.safeTop, w: 64, h: 28, label: audio.isSoundOn() ? '音效开' : '音效关', bg: 'rgba(61,64,91,0.1)', color: '#3D405B', radius: 14, font: '12px sans-serif' }
    }
  }

  draw(ctx) {
    const env = this.app.env
    drawBackground(ctx, env, this.t)
    this.drawHero(ctx, env)
    const L = this.layout()
    L.sound.label = audio.isSoundOn() ? '音效开' : '音效关'
    drawButton(ctx, L.sound, this.pressed === 'sound')
    drawButton(ctx, L.level, this.pressed === 'level')
    drawButton(ctx, L.endless, this.pressed === 'endless')
    drawButton(ctx, L.help, this.pressed === 'help')

    const level = loadJSON(CONFIG.storage.level, 1) || 1
    const best = loadJSON(CONFIG.storage.endlessBest, 0) || 0
    ctx.fillStyle = '#8A8178'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('已解锁第 ' + level + ' 关    无尽最高分 ' + best, env.width / 2, L.help.y + 64)

    ctx.font = '11px sans-serif'
    ctx.fillText('全部道具与复活通过激励视频获取 · 无内购', env.width / 2, env.height - 28)

    if (this.help) this.drawHelp(ctx, env)
  }

  drawHero(ctx, env) {
    ctx.textAlign = 'center'
    ctx.fillStyle = '#3D405B'
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText(CONFIG.name, env.width / 2, env.safeTop + 70)
    ctx.font = '14px sans-serif'
    ctx.fillStyle = '#8A8178'
    ctx.fillText('居家小物 · 二消堆叠', env.width / 2, env.safeTop + 100)

    const cx = env.width / 2
    const cy = env.safeTop + 190
    this.miniCard(ctx, cx - 38, cy - 8, -0.18, ITEMS[0], 0)
    this.miniCard(ctx, cx + 30, cy - 2, 0.16, ITEMS[3], 1)
    this.miniCard(ctx, cx - 4, cy + 18, 0.04, ITEMS[4], 2)
  }

  miniCard(ctx, x, y, rot, item, z) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.shadowColor = 'rgba(61,64,91,0.16)'
    ctx.shadowBlur = 12
    roundRect(ctx, -38, -46, 76, 92, 12)
    ctx.fillStyle = '#FFFBF5'
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = item.color
    roundRect(ctx, -37, -45, 74, 12, 10)
    ctx.fill()
    drawItemIcon(ctx, item.key, 0, 8, 1.6, item.color, item.deep)
    ctx.restore()
  }

  drawHelp(ctx, env) {
    ctx.fillStyle = 'rgba(35,31,28,0.5)'
    ctx.fillRect(0, 0, env.width, env.height)
    const pw = Math.min(330, env.width - 32)
    const ph = 420
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
      '场上同款满 4 张（不含锁块）会合成高级卡',
      '消除一对高级卡会小范围爆炸',
      '达到本关目标分数即通关，不必清空',
      '锁块：消除相邻 2 张卡后解锁',
      '每局 1 次免费搬移，暂存区最多 2 格',
      '提示 / 洗牌 / 额外搬移 / 复活需看广告',
      '无法二消且搬移用尽则失败'
    ]
    ctx.font = '13px sans-serif'
    ctx.fillStyle = '#5C574F'
    ctx.textAlign = 'left'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText((i + 1) + '. ' + lines[i], px + 22, py + 70 + i * 28)
    }
    drawButton(ctx, {
      x: env.width / 2 - 60, y: py + ph - 58, w: 120, h: 38,
      label: '知道了', bg: '#E07A5F', radius: 18
    }, false)
  }

  onTouchStart(x, y) {
    if (this.help) return
    const L = this.layout()
    if (hitButton(L.level, x, y)) this.pressed = 'level'
    else if (hitButton(L.endless, x, y)) this.pressed = 'endless'
    else if (hitButton(L.help, x, y)) this.pressed = 'help'
    else if (hitButton(L.sound, x, y)) this.pressed = 'sound'
  }

  onTouchEnd(x, y) {
    const p = this.pressed
    this.pressed = null
    if (this.help) {
      this.help = false
      return
    }
    const L = this.layout()
    if (p === 'sound' && hitButton(L.sound, x, y)) {
      audio.toggleSound()
      audio.tap()
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
