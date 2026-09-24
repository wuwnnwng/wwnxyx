const { CONFIG, ITEMS } = require('./config')
const { roundRect, drawBackground, drawCard, drawSlot, drawDockTray, drawButton, drawBirdToolButton, drawToolBranch, hitButton, Particles, BIRD_PALETTE } = require('./render')
const board = require('./board')
const ad = require('./ad')
const audio = require('./audio')
const { pointInRect, easeOut, easeInOut, lerp, formatScore } = require('./utils')
const { loadJSON, saveJSON } = require('./env')

class PlayScene {
  constructor(app) {
    this.app = app
    this.particles = new Particles()
    this.resetIdle()
  }

  resetIdle() {
    this.mode = 'level'
    this.cfg = null
    this.cards = []
    this.slots = []
    for (let i = 0; i < CONFIG.move.slotCount; i++) this.slots.push(null)
    this.selected = null
    this.score = 0
    this.combo = 0
    this.comboT = 0
    this.busy = false
    this.overlay = null
    this.toast = null
    this.hints = []
    this.hintT = 0
    this.floaters = []
    this.anims = []
    this.guide = false
    this.time = 0
    this.endlessDiff = 1
    this.matchCount = 0
    this.pressed = null
    this.interstitialShown = false
    this.layout = null
    this.drag = null
    this.hoverSlot = -1
    this.history = []
    this.tools = {
      undo: { unlocked: false, used: false },
      remove: { unlocked: false, used: false },
      shuffle: { unlocked: false, used: false },
      revive: { unlocked: false, used: false }
    }
    this.pendingShare = null
    this.shareAt = 0
    this.timeLeft = 0
    this.shuffleFx = null
  }

  start(mode, level) {
    this.resetIdle()
    this.mode = mode
    const env = this.app.env
    this.layout = this.buildLayout(env)
    this.cfg = mode === 'endless' ? board.getEndlessConfig() : board.getLevelConfig(level || 1)
    this.cards = board.createBoard(this.cfg, this.layout.board, env.cardW, env.cardH)
    this.guide = mode === 'level' && this.cfg.level === 1
    this.overlay = null
    ad.hideBanner()
    this.timeLeft = this.mode === 'level' ? (this.cfg.timeLimit || 120) : 0
    if (this.mode === 'level' && this.cfg.level === 2) {
      this.showToast('注意：从本关开始难度飙升！', 3.6)
    } else if (this.cfg.advancedPairs > 0 && this.cfg.level === 3) {
      this.showToast('金色高级牌是炸弹，两张对消会炸掉周围', 2.4)
    }
    if (!(this.mode === 'level' && this.cfg.level === 1)) {
      let guard = 0
      while (guard < 8 && this.maybeSynth(true)) guard++
    }
    if (this.mode === 'level') {
      this.cfg.target = board.levelTargetFromCards(this.cards, this.cfg)
    }
  }

  buildLayout(env) {
    const headerY = env.safeTop
    const headerH = 36
    const slotCount = CONFIG.move.slotCount
    const trayPadX = 10
    const trayPadY = 6
    const gap = 5
    const titleRow = 20
    const slotW = Math.floor((env.width - trayPadX * 2 - 16 - gap * (slotCount - 1)) / slotCount)
    const slotH = Math.round(slotW * 1.12)
    const nestH = titleRow + slotH + trayPadY * 2
    const btnH = 56
    const toolsGap = 8
    const bottomPad = Math.max(env.safeBottom + 12, 44)
    const boardY = headerY + headerH + 6
    const toolsY = env.height - bottomPad - btnH
    const dockY = toolsY - toolsGap - nestH
    const boardH = Math.max(170, dockY - 4 - boardY)
    const slotsY = dockY + trayPadY + titleRow
    const slots = []
    const slotsX = trayPadX + 8
    for (let i = 0; i < slotCount; i++) {
      slots.push({
        x: slotsX + i * (slotW + gap),
        y: slotsY,
        w: slotW,
        h: slotH
      })
    }
    const side = 12
    const btnGap = 8
    const btnW = Math.floor((env.width - side * 2 - btnGap * 2) / 3)
    const rowW = btnW * 3 + btnGap * 2
    const bx = Math.floor((env.width - rowW) / 2)
    function toolBtn(i, label, pal, face, flap) {
      return {
        x: bx + i * (btnW + btnGap),
        y: toolsY,
        w: btnW,
        h: btnH,
        label: label,
        pal: pal,
        face: face,
        flap: flap
      }
    }
    return {
      headerY: headerY,
      headerH: headerH,
      board: { x: 8, y: boardY, w: env.width - 16, h: boardH },
      dock: { x: 8, y: dockY, w: env.width - 16, h: nestH },
      slots: slots,
      undoBtn: toolBtn(0, '撤回', BIRD_PALETTE[2], 1, 7.2),
      removeBtn: toolBtn(1, '移除', BIRD_PALETTE[0], -1, 8.1),
      shuffleBtn: toolBtn(2, '洗牌', BIRD_PALETTE[3], 1, 6.4),
      backBtn: { x: 12, y: headerY, w: 48, h: 28, label: '返回', bg: 'rgba(61,64,91,0.12)', color: '#3D405B', radius: 14, font: '12px sans-serif' }
    }
  }

  showToast(text, dur) {
    this.toast = { text: text, t: dur || 1.6 }
  }

  addFloater(x, y, text, color) {
    this.floaters.push({ x: x, y: y, text: text, color: color || '#E07A5F', t: 0, life: 0.9 })
  }

  addAnim(obj, to, dur, onDone) {
    this.anims.push({
      obj: obj,
      from: { x: obj.x, y: obj.y, scale: obj.scale || 1 },
      to: to,
      t: 0,
      dur: dur || 0.28,
      onDone: onDone
    })
    this.busy = true
  }

  update(dt) {
    this.time += dt
    if (this.mode === 'level' && !this.overlay && this.timeLeft > 0) {
      this.timeLeft -= dt
      if (this.timeLeft <= 0) {
        this.timeLeft = 0
        this.onTimeout()
      }
    }
    if (this.comboT > 0) {
      this.comboT -= dt
      if (this.comboT <= 0) this.combo = 0
    }
    if (this.toast) {
      this.toast.t -= dt
      if (this.toast.t <= 0) this.toast = null
    }
    if (this.hintT > 0) {
      this.hintT -= dt
      if (this.hintT <= 0) this.hints = []
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i]
      f.t += dt
      if (f.t >= f.life) this.floaters.splice(i, 1)
    }
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i]
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt)
      if (c.glow > 0) c.glow = Math.max(0, c.glow - dt * 2)
    }
    this.particles.update(dt)
    this.updateShuffle(dt)

    if (this.anims.length) {
      for (let i = this.anims.length - 1; i >= 0; i--) {
        const a = this.anims[i]
        a.t += dt
        const k = easeOut(Math.min(1, a.t / a.dur))
        if (a.to.x != null) a.obj.x = lerp(a.from.x, a.to.x, k)
        if (a.to.y != null) a.obj.y = lerp(a.from.y, a.to.y, k)
        if (a.to.scale != null) a.obj.scale = lerp(a.from.scale, a.to.scale, k)
        if (a.t >= a.dur) {
          this.anims.splice(i, 1)
          if (a.onDone) a.onDone()
        }
      }
      if (!this.anims.length && !this.shuffleFx) this.busy = false
    }
  }

  updateShuffle(dt) {
    const fx = this.shuffleFx
    if (!fx) return
    fx.t += dt
    const k = Math.min(1, fx.t / fx.dur)
    const env = this.app.env
    const cx = env.width / 2
    const cy = fx.cy
    for (let i = 0; i < fx.cards.length; i++) {
      const c = fx.cards[i]
      const from = fx.from[i]
      const to = fx.to[i]
      let px
      let py
      let spin
      let sc
      if (k < 0.32) {
        const u = easeOut(k / 0.32)
        px = lerp(from.x, cx - c.w / 2, u)
        py = lerp(from.y, cy - c.h / 2, u)
        spin = u * Math.PI * 2 * (i % 2 ? 1 : -1)
        sc = lerp(1, 0.82, u)
      } else if (k < 0.62) {
        const u = (k - 0.32) / 0.3
        const ang = u * Math.PI * 2 + i * (Math.PI * 2 / fx.cards.length)
        const rad = 36 + (i % 5) * 10
        px = cx + Math.cos(ang) * rad - c.w / 2
        py = cy + Math.sin(ang) * rad * 0.55 - c.h / 2
        spin = ang * 1.4
        sc = 0.78
      } else {
        const u = easeInOut((k - 0.62) / 0.38)
        const ang = Math.PI * 2 + i * (Math.PI * 2 / fx.cards.length)
        const rad = 36 + (i % 5) * 10
        const mx = cx + Math.cos(ang) * rad - c.w / 2
        const my = cy + Math.sin(ang) * rad * 0.55 - c.h / 2
        px = lerp(mx, to.x, u)
        py = lerp(my, to.y, u)
        spin = (1 - u) * ang
        sc = lerp(0.78, 1, u)
      }
      c.x = px
      c.y = py
      c.spin = spin
      c.scale = sc
    }
    if (k >= 1) {
      for (let i = 0; i < fx.cards.length; i++) {
        const c = fx.cards[i]
        c.x = fx.to[i].x
        c.y = fx.to[i].y
        c.w = fx.to[i].w
        c.h = fx.to[i].h
        c.layer = fx.to[i].layer
        c.spin = 0
        c.scale = 1
      }
      this.shuffleFx = null
      this.busy = false
      this.particles.burst(cx, cy, '#E9C46A', 22)
      this.particles.burst(cx, cy, '#E07A5F', 14)
      this.afterBoardChange()
    }
  }

  draw(ctx) {
    const env = this.app.env
    const L = this.layout
    drawBackground(ctx, env, this.time)

    this.drawHeader(ctx, env, L)
    this.drawBoardFrame(ctx, L)

    const list = this.cards.filter(function (c) { return !c.removed }).sort(function (a, b) {
      const la = a.slotIndex != null ? 1000 : a.layer
      const lb = b.slotIndex != null ? 1000 : b.layer
      return la - lb
    })

    const wantMove = (this.selected && this.selected.slotIndex == null) || (this.drag && this.drag.active)
    drawDockTray(ctx, L.dock)
    for (let i = 0; i < L.slots.length; i++) {
      const hover = this.hoverSlot === i && wantMove
      drawSlot(ctx, L.slots[i], !!this.slots[i], hover || (wantMove && !this.slots[i] && this.hoverSlot < 0), i)
    }
    this.drawDockTitle(ctx, env, L)

    let selectedCard = null
    const liftId = this.drag && this.drag.active ? this.drag.card.id : (this.selected && this.selected.id)
    for (let i = 0; i < list.length; i++) {
      const c = list[i]
      if (liftId && liftId === c.id) {
        selectedCard = c
        continue
      }
      drawCard(ctx, c, {
        covered: board.isCovered(c, this.cards),
        selected: false,
        hint: this.hints.indexOf(c.id) >= 0,
        hintPulse: 0.5 + 0.5 * Math.sin(this.time * 8)
      })
    }
    if (selectedCard) {
      drawCard(ctx, selectedCard, {
        covered: false,
        selected: !this.drag || !this.drag.active,
        lift: this.drag && this.drag.active,
        hint: this.hints.indexOf(selectedCard.id) >= 0,
        hintPulse: 0.5 + 0.5 * Math.sin(this.time * 8)
      })
    }

    this.particles.draw(ctx)
    this.drawFloaters(ctx)
    this.syncToolButtons(L)
    drawToolBranch(ctx, 10, L.undoBtn.y + 22, env.width - 20)
    drawBirdToolButton(ctx, L.undoBtn, this.pressed === 'undo', this.time)
    drawBirdToolButton(ctx, L.removeBtn, this.pressed === 'remove', this.time)
    drawBirdToolButton(ctx, L.shuffleBtn, this.pressed === 'shuffle', this.time)

    if (this.guide && !this.overlay) this.drawGuide(ctx, env)
    if (this.overlay) this.drawOverlay(ctx, env)
    if (this.toast) this.drawToast(ctx, env)
  }

  drawHeader(ctx, env, L) {
    drawButton(ctx, L.backBtn, this.pressed === 'back')

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#3D405B'
    ctx.font = 'bold 17px sans-serif'
    ctx.fillText(CONFIG.name, 68, L.headerY + 10)

    ctx.font = '11px sans-serif'
    ctx.fillStyle = '#8A8178'
    const sub = this.mode === 'endless' ? '无尽模式' : ('第' + this.cfg.level + '关 · ' + this.cfg.name)
    ctx.fillText(sub, 68, L.headerY + 26)

    const scoreX = env.width - 16
    ctx.textAlign = 'right'
    ctx.fillStyle = '#3D405B'
    ctx.font = 'bold 18px sans-serif'
    if (this.mode === 'endless') {
      const best = loadJSON(CONFIG.storage.endlessBest, 0) || 0
      ctx.fillText(formatScore(this.score), scoreX, L.headerY + 10)
      ctx.font = '10px sans-serif'
      ctx.fillStyle = '#8A8178'
      ctx.fillText('最高 ' + formatScore(best), scoreX, L.headerY + 26)
    } else {
      ctx.fillText(formatScore(this.score) + ' / ' + this.cfg.target, scoreX, L.headerY + 10)
      ctx.font = 'bold 12px sans-serif'
      const low = this.timeLeft <= 15
      ctx.fillStyle = low ? '#C45C42' : '#8A8178'
      ctx.fillText(this.formatClock(this.timeLeft), scoreX, L.headerY + 26)
    }

    if (this.combo >= 2) {
      ctx.textAlign = 'center'
      ctx.fillStyle = '#E07A5F'
      ctx.font = 'bold 13px sans-serif'
      ctx.fillText('连击 x' + this.combo, env.width / 2, L.headerY + L.headerH + 2)
    }
  }

  drawDockTitle(ctx, env, L) {
    let filled = 0
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] && !this.slots[i].removed) filled++
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FFF6E8'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText('鸟巢  ' + filled + '/' + this.slots.length, env.width / 2, L.dock.y + 17)
  }

  drawBoardFrame(ctx, L) {
    roundRect(ctx, L.board.x, L.board.y, L.board.w, L.board.h, 16)
    ctx.fillStyle = 'rgba(255,251,245,0.14)'
    ctx.fill()
  }

  drawFloaters(ctx) {
    for (let i = 0; i < this.floaters.length; i++) {
      const f = this.floaters[i]
      const k = f.t / f.life
      ctx.globalAlpha = 1 - k
      ctx.fillStyle = f.color
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(f.text, f.x, f.y - k * 36)
    }
    ctx.globalAlpha = 1
  }

  drawToast(ctx, env) {
    const w = Math.min(env.width - 48, 280)
    const x = (env.width - w) / 2
    const y = env.height * 0.38
    roundRect(ctx, x, y, w, 40, 20)
    ctx.fillStyle = 'rgba(61,64,91,0.88)'
    ctx.fill()
    ctx.fillStyle = '#FFFBF5'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.toast.text, env.width / 2, y + 20)
  }

  drawGuide(ctx, env) {
    roundRect(ctx, 24, env.safeTop + 88, env.width - 48, 54, 12)
    ctx.fillStyle = 'rgba(61,64,91,0.86)'
    ctx.fill()
    ctx.fillStyle = '#FFFBF5'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('点卡牌会飞进鸟巢，相同自动消除', env.width / 2, env.safeTop + 108)
    ctx.font = '11px sans-serif'
    ctx.fillStyle = '#F2CC8F'
    ctx.fillText('撤回/移除/洗牌需分享解锁，每关限用 1 次', env.width / 2, env.safeTop + 126)
  }

  drawOverlay(ctx, env) {
    const o = this.overlay
    ctx.fillStyle = 'rgba(35, 31, 28, 0.55)'
    ctx.fillRect(0, 0, env.width, env.height)
    const pw = Math.min(320, env.width - 40)
    const ph = o.kind === 'confirm' || o.kind === 'timeout' ? 210 : 280
    const px = (env.width - pw) / 2
    const py = (env.height - ph) / 2 - 20
    roundRect(ctx, px, py, pw, ph, 20)
    ctx.fillStyle = '#FFFBF5'
    ctx.fill()

    ctx.fillStyle = '#3D405B'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(o.title, env.width / 2, py + 42)

    ctx.fillStyle = '#6D6A66'
    ctx.font = '14px sans-serif'
    const lines = o.desc.split('\n')
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], env.width / 2, py + 78 + i * 22)
    }

    o.buttons.forEach(function (b) {
      drawButton(ctx, b, false)
    })
  }

  makeOverlayButtons(kind) {
    const env = this.app.env
    const pw = Math.min(320, env.width - 40)
    const ph = kind === 'confirm' || kind === 'timeout' ? 210 : 280
    const px = (env.width - pw) / 2
    const py = (env.height - ph) / 2 - 20
    const bw = (pw - 48) / 2
    const by = py + ph - 62
    if (kind === 'win') {
      return [
        { id: 'home', x: px + 16, y: by, w: bw, h: 42, label: '返回首页', bg: '#EDE6DC', color: '#3D405B', radius: 18 },
        { id: 'next', x: px + 32 + bw, y: by, w: bw, h: 42, label: '下一关', bg: '#E07A5F', radius: 18 }
      ]
    }
    if (kind === 'fail') {
      const st = this.tools.revive
      let reviveLabel = '分享复活'
      let reviveBg = '#E07A5F'
      let reviveColor = '#fff'
      if (st.used) {
        reviveLabel = '已用完'
        reviveBg = '#EDE6DC'
        reviveColor = '#8A8178'
      } else if (st.unlocked) {
        reviveLabel = '复活 (1)'
      }
      return [
        { id: 'retry', x: px + 16, y: by, w: bw, h: 42, label: '重开本局', bg: '#EDE6DC', color: '#3D405B', radius: 18 },
        { id: 'revive', x: px + 32 + bw, y: by, w: bw, h: 42, label: reviveLabel, bg: reviveBg, color: reviveColor, radius: 18 }
      ]
    }
    if (kind === 'timeout') {
      return [
        { id: 'home', x: px + 16, y: by, w: bw, h: 42, label: '返回首页', bg: '#EDE6DC', color: '#3D405B', radius: 18 },
        { id: 'retry', x: px + 32 + bw, y: by, w: bw, h: 42, label: '重新闯关', bg: '#E07A5F', radius: 18 }
      ]
    }
    return [
      { id: 'cancel', x: px + 16, y: by, w: bw, h: 42, label: '继续游戏', bg: '#EDE6DC', color: '#3D405B', radius: 18 },
      { id: 'home', x: px + 32 + bw, y: by, w: bw, h: 42, label: '返回首页', bg: '#E07A5F', radius: 18 }
    ]
  }

  slotIndexAt(x, y) {
    const L = this.layout
    if (!L) return -1
    for (let i = 0; i < L.slots.length; i++) {
      if (pointInRect(x, y, L.slots[i])) return i
    }
    if (L.dock && pointInRect(x, y, L.dock)) {
      let best = -1
      let bestD = 1e9
      for (let i = 0; i < L.slots.length; i++) {
        const s = L.slots[i]
        const dx = x - (s.x + s.w / 2)
        const dy = y - (s.y + s.h / 2)
        const d = dx * dx + dy * dy
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      return best
    }
    return -1
  }

  beginDrag(card, x, y) {
    this.drag = {
      card: card,
      grabX: x - card.x,
      grabY: y - card.y,
      originX: card.x,
      originY: card.y,
      startX: x,
      startY: y,
      active: false
    }
    this.hoverSlot = -1
  }

  restoreDrag() {
    const d = this.drag
    if (!d || !d.card) return
    d.card.x = d.originX
    d.card.y = d.originY
    d.card.scale = 1
    this.hoverSlot = -1
  }

  finishDrag(x, y) {
    const d = this.drag
    this.drag = null
    this.hoverSlot = -1
    if (!d || !d.card || d.card.removed) return
    const card = d.card
    const idx = this.slotIndexAt(x, y)
    if (idx < 0) {
      card.x = d.originX
      card.y = d.originY
      card.scale = 1
      return
    }
    if (card.locked) {
      card.x = d.originX
      card.y = d.originY
      card.scale = 1
      return
    }
    const parked = this.slots[idx]
    if (parked && !parked.removed && board.canMatch(card, parked)) {
      this.doMatch(card, parked)
      return
    }
    const staged = board.findStagingMatch(card, this.slots)
    if (staged) {
      this.doMatch(card, staged)
      return
    }
    if (parked && !parked.removed) {
      card.x = d.originX
      card.y = d.originY
      card.scale = 1
      this.showToast('这个暂存格已占用')
      return
    }
    const empty = parked ? -1 : idx
    const target = empty >= 0 ? empty : board.emptySlotIndex(this.slots)
    if (target < 0) {
      card.x = d.originX
      card.y = d.originY
      card.scale = 1
      this.showToast('暂存区已满')
      return
    }
    this.selected = card
    this.applyMove(target)
  }

  onTouchStart(x, y) {
    this.pressed = null
    this.drag = null
    this.hoverSlot = -1
    if (this.overlay || this.busy) return
    const L = this.layout
    if (hitButton(L.backBtn, x, y)) {
      this.pressed = 'back'
      return
    }
    if (hitButton(L.undoBtn, x, y)) {
      this.pressed = 'undo'
      return
    }
    if (hitButton(L.removeBtn, x, y)) {
      this.pressed = 'remove'
      return
    }
    if (hitButton(L.shuffleBtn, x, y)) {
      this.pressed = 'shuffle'
      return
    }
  }

  onTouchMove(x, y) {
    if (this.overlay || this.busy || !this.drag) return
    const d = this.drag
    const dx = x - d.startX
    const dy = y - d.startY
    if (!d.active && dx * dx + dy * dy > 100) {
      d.active = true
      this.selected = d.card
      d.card.scale = 1.08
    }
    if (!d.active) return
    d.card.x = x - d.grabX
    d.card.y = y - d.grabY
    this.hoverSlot = this.slotIndexAt(x, y)
  }

  onTouchCancel() {
    if (this.drag && this.drag.active) this.restoreDrag()
    this.drag = null
    this.hoverSlot = -1
    this.pressed = null
  }

  onTouchEnd(x, y) {
    const dragging = this.drag && this.drag.active
    if (dragging) {
      this.pressed = null
      this.finishDrag(x, y)
      return
    }
    this.drag = null
    this.hoverSlot = -1
    this.pressed = null
    if (this.overlay) {
      this.handleOverlay(x, y)
      return
    }
    if (this.busy) return
    const L = this.layout
    if (hitButton(L.backBtn, x, y)) {
      this.overlay = {
        kind: 'confirm',
        title: '返回首页？',
        desc: '当前对局进度将不会保存',
        buttons: this.makeOverlayButtons('confirm')
      }
      return
    }
    if (hitButton(L.undoBtn, x, y)) {
      this.tryTool('undo')
      return
    }
    if (hitButton(L.removeBtn, x, y)) {
      this.tryTool('remove')
      return
    }
    if (hitButton(L.shuffleBtn, x, y)) {
      this.tryTool('shuffle')
      return
    }
    for (let i = 0; i < L.slots.length; i++) {
      if (!pointInRect(x, y, L.slots[i])) continue
      const parked = this.slots[i]
      if (parked && !parked.removed) {
        this.handleCard(parked)
        return
      }
      this.tryMoveToSlot(i)
      return
    }
    this.handleBoardTap(x, y)
  }

  handleOverlay(x, y) {
    const o = this.overlay
    for (let i = 0; i < o.buttons.length; i++) {
      const b = o.buttons[i]
      if (!hitButton(b, x, y)) continue
      audio.tap()
      if (b.id === 'home') {
        ad.hideBanner()
        this.app.goHome()
      } else if (b.id === 'cancel') {
        this.overlay = null
      } else if (b.id === 'next') {
        ad.showInterstitial()
        this.nextLevel()
      } else if (b.id === 'retry') {
        this.start(this.mode, this.cfg.level)
      } else if (b.id === 'revive') {
        this.tryRevive()
      }
      return
    }
  }

  handleBoardTap(x, y) {
    const card = board.findCardAt(this.cards, x, y)
    if (!card) {
      this.selected = null
      return
    }
    this.handleCard(card)
  }

  handleCard(card) {
    if (card.locked) {
      audio.lock()
      card.shake = 0.25
      this.showToast('先消除旁边的卡牌来开锁')
      return
    }
    const staged = board.findStagingMatch(card, this.slots)
    if (staged) {
      this.doMatch(card, staged)
      return
    }
    if (card.slotIndex != null) return
    const idx = board.emptySlotIndex(this.slots)
    if (idx < 0) {
      this.showToast('鸟巢已满')
      return
    }
    this.selected = card
    this.applyMove(idx)
  }

  tryMoveToSlot(index) {
    if (!this.selected) return
    if (this.selected.slotIndex != null) return
    if (this.slots[index]) {
      this.showToast('这个暂存格已占用')
      return
    }
    this.applyMove(index)
  }

  applyMove(index) {
    const card = this.selected
    if (!card) return
    const r = this.layout.slots[index]
    if (!r || this.slots[index]) return
    this.selected = null
    card.scale = 1
    this.history.push({
      card: card,
      x: card.x,
      y: card.y,
      w: card.w,
      h: card.h,
      layer: card.layer
    })
    this.slots[index] = card
    card.slotIndex = index
    card.layer = 100 + index
    try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    const self = this
    this.addAnim(card, {
      x: r.x + (r.w - Math.max(24, r.w - 6)) / 2,
      y: r.y + (r.h - Math.max(28, r.h - 8)) / 2,
      scale: Math.min((r.w - 6) / (card.boardW || card.w), 1)
    }, 0.22, function () {
      board.fitCardInSlot(card, r)
      self.maybeClearSlotPairs()
    })
  }

  maybeClearSlotPairs() {
    board.compactSlots(this.slots, this.layout.slots)
    const pair = board.findSlotPair(this.slots)
    if (pair) {
      this.doMatch(pair[0], pair[1])
      return
    }
    this.afterBoardChange()
  }

  doMatch(a, b) {
    this.guide = false
    this.busy = true
    this.selected = null
    a.scale = 1
    b.scale = 1
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const advanced = a.advanced && b.advanced
    const item = ITEMS[a.type]
    audio.match()
    try { wx.vibrateShort({ type: 'medium' }) } catch (e) {}

    let pending = 2
    const self = this
    const done = function () {
      pending -= 1
      if (pending > 0) return
      board.clearSlotOf(a, self.slots)
      board.clearSlotOf(b, self.slots)
      a.removed = true
      b.removed = true
      const unlocked = board.applyLockDamage(self.cards, [a, b])
      if (unlocked.length) self.showToast('锁开了！')
      self.combo += 1
      self.comboT = 2.4
      self.matchCount += 1
      const base = advanced ? CONFIG.score.advancedPair : CONFIG.score.pair
      const gain = Math.round(base * (1 + (self.combo - 1) * CONFIG.score.comboStep))
      self.score += gain
      self.addFloater(mx + 30, my, '+' + gain, item.color)
      self.particles.burst(mx + 30, my + 30, item.color, 14)

      if (advanced) {
        audio.boom()
        const cx = mx + a.w / 2
        const cy = my + a.h / 2
        const extra = board.explodeAround(self.cards, cx, cy)
        extra.forEach(function (c) {
          board.clearSlotOf(c, self.slots)
          self.score += CONFIG.score.explodeEach
          self.particles.burst(c.x + c.w / 2, c.y + c.h / 2, '#E9C46A', 8)
        })
        if (extra.length) self.addFloater(cx, cy - 20, '高级爆炸 +' + extra.length * CONFIG.score.explodeEach, '#E9C46A')
      }
      self.afterBoardChange()
    }
    this.addAnim(a, { x: mx, y: my, scale: 0.2 }, 0.22, done)
    this.addAnim(b, { x: mx, y: my, scale: 0.22 }, 0.22, done)
  }

  maybeSynth(silent) {
    const groups = board.findSynthesisGroups(this.cards)
    if (!groups.length) return false
    const g = groups[0]
    const self = this
    const cx = g.reduce(function (s, c) { return s + c.x }, 0) / g.length
    const cy = g.reduce(function (s, c) { return s + c.y }, 0) / g.length
    if (silent) {
      const adv = board.synthesizeGroup(g, this.cards, this.layout.board)
      this.relayoutSlot(adv)
      return true
    }
    this.busy = true
    audio.synth()
    let n = g.length
    g.forEach(function (c) {
      self.addAnim(c, { x: cx, y: cy, scale: 0.2 }, 0.28, function () {
        n -= 1
        if (n > 0) return
        g.forEach(function (card) { board.clearSlotOf(card, self.slots) })
        const adv = board.synthesizeGroup(g, self.cards, self.layout.board)
        self.relayoutSlot(adv)
        self.score += CONFIG.score.synth
        self.addFloater(cx + 30, cy, '合成高级牌 +' + CONFIG.score.synth, '#E9C46A')
        self.particles.burst(cx + 30, cy + 20, '#E9C46A', 16)
        self.afterBoardChange()
      })
    })
    return true
  }

  relayoutSlot(card) {
    if (card.slotIndex == null) return
    const r = this.layout.slots[card.slotIndex]
    if (!r) {
      card.slotIndex = null
      return
    }
    this.slots[card.slotIndex] = card
    board.fitCardInSlot(card, r)
  }

  afterBoardChange() {
    if (this.overlay) return
    if (this.mode === 'level' && this.score >= this.cfg.target) {
      this.onWin()
      return
    }
    board.compactSlots(this.slots, this.layout.slots)
    const pair = board.findSlotPair(this.slots)
    if (pair) {
      this.doMatch(pair[0], pair[1])
      return
    }
    if (this.maybeSynth(false)) return
    if (this.mode === 'endless') {
      const best = loadJSON(CONFIG.storage.endlessBest, 0) || 0
      if (this.score > best) saveJSON(CONFIG.storage.endlessBest, this.score)
      if (this.matchCount > 0 && this.matchCount % 2 === 0) {
        this.endlessDiff += 0.15
        board.spawnEndless(this.cards, this.layout.board, this.app.env.cardW, this.app.env.cardH, this.endlessDiff)
        if (this.maybeSynth(false)) return
      }
    }
    if (this.mode === 'level' && board.activeCards(this.cards).length === 0) {
      this.onWin()
      return
    }
    if (board.isFailed(this.cards, this.slots)) this.onFail()
  }

  onWin() {
    if (this.overlay) return
    audio.win()
    const unlocked = loadJSON(CONFIG.storage.level, 1) || 1
    if (this.cfg.level + 1 > unlocked) saveJSON(CONFIG.storage.level, this.cfg.level + 1)
    this.overlay = {
      kind: 'win',
      title: '本关完成',
      desc: this.cfg.level === 1
        ? '教学关已过关！\n下一关开始难度将飙升'
        : (this.cfg.name + '  得分 ' + this.score + '\n已达到本关目标分数'),
      buttons: this.makeOverlayButtons('win')
    }
  }

  onFail() {
    if (this.overlay) return
    audio.fail()
    this.overlay = {
      kind: 'fail',
      title: '鸟巢已满',
      desc: '底部 7 格已经满了，且没有可消的对子\n分享可复活一次，把鸟巢里的牌移回场上',
      buttons: this.makeOverlayButtons('fail')
    }
  }

  nextLevel() {
    ad.hideBanner()
    this.start('level', this.cfg.level + 1)
  }

  tryRevive() {
    const st = this.tools.revive
    if (!st || st.used) {
      this.showToast('本关复活已用完')
      return
    }
    if (!st.unlocked) {
      this.askShare('revive')
      return
    }
    this.applyShareRevive()
  }

  applyShareRevive() {
    this.overlay = null
    if (!this.dumpNestToBoard()) {
      this.showToast('鸟巢是空的')
      return
    }
    this.consumeTool('revive')
    this.showToast('复活成功，鸟巢已移出')
    this.afterBoardChange()
  }

  formatClock(sec) {
    const n = Math.max(0, Math.ceil(sec))
    const m = Math.floor(n / 60)
    const r = n % 60
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r
  }

  syncToolButtons(L) {
    const map = [
      [L.undoBtn, this.tools.undo],
      [L.removeBtn, this.tools.remove],
      [L.shuffleBtn, this.tools.shuffle]
    ]
    for (let i = 0; i < map.length; i++) {
      const btn = map[i][0]
      const st = map[i][1]
      btn.locked = !st.unlocked
      btn.used = st.used
      btn.badge = st.unlocked && !st.used ? 1 : 0
    }
  }

  tryTool(key) {
    const st = this.tools[key]
    if (!st) return
    if (st.used) {
      this.showToast('本关已用完')
      return
    }
    if (!st.unlocked) {
      this.askShare(key)
      return
    }
    if (key === 'undo') this.useUndo()
    else if (key === 'remove') this.useRemove()
    else if (key === 'shuffle') this.useShuffle()
  }

  consumeTool(key) {
    if (this.tools[key]) this.tools[key].used = true
  }

  askShare(key) {
    this.pendingShare = key
    this.shareAt = Date.now()
    const names = { undo: '撤回', remove: '移除', shuffle: '洗牌', revive: '复活' }
    try {
      wx.shareAppMessage({
        title: '好鸟哥｜帮我过关，解锁一次' + (names[key] || '道具'),
        query: 'tool=' + key
      })
    } catch (e) {}
    this.showToast('分享后返回即可解锁')
  }

  onShow() {
    if (!this.pendingShare) return
    if (Date.now() - this.shareAt < 250) return
    const key = this.pendingShare
    this.pendingShare = null
    if (this.tools[key] && !this.tools[key].used) {
      this.tools[key].unlocked = true
      this.showToast('已解锁，本关可使用 1 次')
      if (key === 'revive' && this.overlay && this.overlay.kind === 'fail') {
        this.overlay.buttons = this.makeOverlayButtons('fail')
      }
    }
  }

  onTimeout() {
    if (this.overlay) return
    this.busy = false
    this.shuffleFx = null
    audio.fail()
    this.overlay = {
      kind: 'timeout',
      title: '时间到',
      desc: '本关超时，只能重新闯关',
      buttons: this.makeOverlayButtons('timeout')
    }
  }

  useShuffle() {
    if (this.busy) return
    const pile = []
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i]
      if (c.removed || c.slotIndex != null) continue
      pile.push(c)
    }
    if (!pile.length) {
      this.showToast('没有可洗的卡牌')
      return
    }
    const from = []
    for (let i = 0; i < pile.length; i++) {
      const c = pile[i]
      from.push({ x: c.x, y: c.y, w: c.w, h: c.h, layer: c.layer })
    }
    board.shuffleBoard(this.cards, this.layout.board, this.cfg)
    const to = []
    for (let i = 0; i < pile.length; i++) {
      const c = pile[i]
      to.push({ x: c.x, y: c.y, w: c.w, h: c.h, layer: c.layer })
      c.x = from[i].x
      c.y = from[i].y
      c.w = from[i].w
      c.h = from[i].h
      c.layer = from[i].layer
    }
    this.selected = null
    this.busy = true
    this.consumeTool('shuffle')
    const box = this.layout.board
    this.shuffleFx = {
      t: 0,
      dur: 1.15,
      cards: pile,
      from: from,
      to: to,
      cy: box.y + box.h * 0.42
    }
    this.particles.burst(this.app.env.width / 2, this.shuffleFx.cy, '#F2CC8F', 18)
  }

  useUndo() {
    if (this.busy) return
    while (this.history.length) {
      const rec = this.history.pop()
      const c = rec.card
      if (!c || c.removed || c.slotIndex == null) continue
      board.clearSlotOf(c, this.slots)
      c.x = rec.x
      c.y = rec.y
      c.w = rec.w
      c.h = rec.h
      c.layer = rec.layer
      c.scale = 1
      board.compactSlots(this.slots, this.layout.slots)
      this.consumeTool('undo')
      this.showToast('已撤回')
      return
    }
    this.showToast('没有可撤回的卡牌')
  }

  dumpNestToBoard() {
    const parked = []
    for (let i = 0; i < this.slots.length; i++) {
      const c = this.slots[i]
      if (c && !c.removed) parked.push(c)
    }
    if (!parked.length) return false
    let top = 0
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i]
      if (c.removed || c.slotIndex != null) continue
      if (c.layer > top) top = c.layer
    }
    const box = this.layout.board
    const n = parked.length
    for (let i = 0; i < n; i++) {
      const c = parked[i]
      board.clearSlotOf(c, this.slots)
      c.w = c.boardW || c.w
      c.h = c.boardH || c.h
      c.scale = 1
      c.layer = top + 1
      const span = n * (c.w + 6) - 6
      c.x = box.x + Math.max(4, (box.w - span) / 2) + i * (c.w + 6)
      c.y = box.y + box.h - c.h - 8
      if (c.x < box.x) c.x = box.x
      if (c.x + c.w > box.x + box.w) c.x = box.x + box.w - c.w
    }
    this.history = []
    board.compactSlots(this.slots, this.layout.slots)
    return true
  }

  useRemove() {
    if (this.busy) return
    if (!this.dumpNestToBoard()) {
      this.showToast('鸟巢是空的')
      return
    }
    this.consumeTool('remove')
    this.showToast('已移出鸟巢')
  }
}

module.exports = PlayScene
