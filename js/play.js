const { CONFIG, ITEMS } = require('./config')
const { roundRect, drawBackground, drawCard, drawSlot, drawButton, hitButton, Particles } = require('./render')
const board = require('./board')
const ad = require('./ad')
const audio = require('./audio')
const { pointInRect, easeOut, lerp, formatScore } = require('./utils')
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
    ad.showBanner(env)
    if (this.cfg.advancedPairs > 0 && this.cfg.level === 3) {
      this.showToast('金色高级牌是炸弹，两张对消会炸掉周围', 2.4)
    }
    let guard = 0
    while (guard < 8 && this.maybeSynth(true)) guard++
  }

  buildLayout(env) {
    const headerY = env.safeTop
    const headerH = 58
    const slotCount = CONFIG.move.slotCount
    const sidePad = 10
    const gap = 4
    const slotW = Math.floor((env.width - sidePad * 2 - gap * (slotCount - 1)) / slotCount)
    const slotH = Math.round(slotW * 1.22)
    const toolsH = 36 + slotH + 28
    const boardY = headerY + headerH + 18
    const boardH = env.height - boardY - toolsH - env.bannerH
    const barY = boardY + boardH + 8
    const slotsY = barY + 32
    const slots = []
    for (let i = 0; i < slotCount; i++) {
      slots.push({
        x: sidePad + i * (slotW + gap),
        y: slotsY,
        w: slotW,
        h: slotH
      })
    }
    const btnW = 52
    return {
      headerY: headerY,
      headerH: headerH,
      board: { x: 10, y: boardY, w: env.width - 20, h: boardH },
      slots: slots,
      hintBtn: { x: 12, y: barY, w: btnW, h: 28, label: '提示', bg: '#81B29A', radius: 14, font: 'bold 12px sans-serif' },
      shuffleBtn: { x: env.width - 12 - btnW, y: barY, w: btnW, h: 28, label: '洗牌', bg: '#E9C46A', color: '#3D405B', radius: 14, font: 'bold 12px sans-serif' },
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
      if (!this.anims.length) this.busy = false
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

    const wantMove = this.selected && this.selected.slotIndex == null
    for (let i = 0; i < L.slots.length; i++) {
      drawSlot(ctx, L.slots[i], !!this.slots[i], wantMove && !this.slots[i])
    }

    let selectedCard = null
    for (let i = 0; i < list.length; i++) {
      const c = list[i]
      if (this.selected && this.selected.id === c.id) {
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
        selected: true,
        hint: this.hints.indexOf(selectedCard.id) >= 0,
        hintPulse: 0.5 + 0.5 * Math.sin(this.time * 8)
      })
    }

    this.particles.draw(ctx)
    this.drawFloaters(ctx)
    this.drawFooter(ctx, L)

    if (this.guide && !this.overlay) this.drawGuide(ctx, env)
    if (this.toast) this.drawToast(ctx, env)
    if (this.overlay) this.drawOverlay(ctx, env)
  }

  drawHeader(ctx, env, L) {
    drawButton(ctx, L.backBtn, this.pressed === 'back')

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#3D405B'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(CONFIG.name, 68, L.headerY + 14)

    ctx.font = '11px sans-serif'
    ctx.fillStyle = '#8A8178'
    const sub = this.mode === 'endless' ? '无尽模式' : ('第' + this.cfg.level + '关 · ' + this.cfg.name)
    ctx.fillText(sub, 68, L.headerY + 34)

    const scoreX = env.width - 16
    ctx.textAlign = 'right'
    ctx.fillStyle = '#3D405B'
    ctx.font = 'bold 20px sans-serif'
    if (this.mode === 'endless') {
      const best = loadJSON(CONFIG.storage.endlessBest, 0) || 0
      ctx.fillText(formatScore(this.score), scoreX, L.headerY + 16)
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#8A8178'
      ctx.fillText('最高 ' + formatScore(best), scoreX, L.headerY + 36)
    } else {
      ctx.fillText(formatScore(this.score) + ' / ' + this.cfg.target, scoreX, L.headerY + 16)
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#8A8178'
      ctx.fillText('目标分数', scoreX, L.headerY + 36)
    }

    const chipY = L.headerY + L.headerH - 2
    let filled = 0
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] && !this.slots[i].removed) filled++
    }
    roundRect(ctx, 12, chipY, 108, 22, 11)
    ctx.fillStyle = '#FFFBF5'
    ctx.fill()
    ctx.fillStyle = filled >= this.slots.length ? '#C45C42' : '#E07A5F'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('暂存  ' + filled + '/' + this.slots.length, 66, chipY + 12)

    if (this.combo >= 2) {
      ctx.fillStyle = '#E07A5F'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText('连击 x' + this.combo, env.width / 2, chipY + 12)
    }
  }

  drawBoardFrame(ctx, L) {
    roundRect(ctx, L.board.x, L.board.y, L.board.w, L.board.h, 16)
    ctx.fillStyle = 'rgba(255,251,245,0.28)'
    ctx.fill()
  }

  drawFooter(ctx, L) {
    const env = this.app.env
    ctx.fillStyle = '#8A8178'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('暂存区 · 相同自动消除', env.width / 2, L.hintBtn.y + 14)
    drawButton(ctx, L.hintBtn, this.pressed === 'hint')
    drawButton(ctx, L.shuffleBtn, this.pressed === 'shuffle')
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
    ctx.fillText('点两张相同卡牌消除，或放入暂存区自动对消', env.width / 2, env.safeTop + 108)
    ctx.font = '11px sans-serif'
    ctx.fillStyle = '#F2CC8F'
    ctx.fillText('暂存 7 格，两张一样会立刻消除', env.width / 2, env.safeTop + 126)
  }

  drawOverlay(ctx, env) {
    const o = this.overlay
    ctx.fillStyle = 'rgba(35, 31, 28, 0.55)'
    ctx.fillRect(0, 0, env.width, env.height)
    const pw = Math.min(320, env.width - 40)
    const ph = o.kind === 'confirm' ? 210 : 280
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
    const ph = kind === 'confirm' ? 210 : 280
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
      return [
        { id: 'retry', x: px + 16, y: by, w: bw, h: 42, label: '重开本局', bg: '#EDE6DC', color: '#3D405B', radius: 18 },
        { id: 'revive', x: px + 32 + bw, y: by, w: bw, h: 42, label: '看广告复活', bg: '#E07A5F', radius: 18 }
      ]
    }
    return [
      { id: 'cancel', x: px + 16, y: by, w: bw, h: 42, label: '继续游戏', bg: '#EDE6DC', color: '#3D405B', radius: 18 },
      { id: 'home', x: px + 32 + bw, y: by, w: bw, h: 42, label: '返回首页', bg: '#E07A5F', radius: 18 }
    ]
  }

  onTouchStart(x, y) {
    const L = this.layout
    if (hitButton(L.backBtn, x, y)) this.pressed = 'back'
    else if (hitButton(L.hintBtn, x, y)) this.pressed = 'hint'
    else if (hitButton(L.shuffleBtn, x, y)) this.pressed = 'shuffle'
  }

  onTouchEnd(x, y) {
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
    if (hitButton(L.hintBtn, x, y)) {
      this.useHint()
      return
    }
    if (hitButton(L.shuffleBtn, x, y)) {
      this.useShuffle()
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
    if (card.slotIndex == null && board.isCovered(card, this.cards)) {
      card.shake = 0.25
      this.showToast('被上层压住，无法点击')
      return
    }
    const staged = board.findStagingMatch(card, this.slots)
    if (staged) {
      this.doMatch(card, staged)
      return
    }
    if (!this.selected) {
      this.selected = card
      card.scale = 1.06
      audio.tap()
      return
    }
    if (this.selected.id === card.id) {
      if (card.slotIndex != null) {
        this.selected.scale = 1
        this.selected = null
        return
      }
      const idx = board.emptySlotIndex(this.slots)
      if (idx < 0) {
        this.showToast('暂存区已满')
        return
      }
      this.tryMoveToSlot(idx)
      return
    }
    if (board.canMatch(this.selected, card) && board.isFree(card, this.cards) && board.isFree(this.selected, this.cards)) {
      this.doMatch(this.selected, card)
      return
    }
    this.selected.scale = 1
    this.selected = card
    card.scale = 1.06
    audio.tap()
  }

  tryMoveToSlot(index) {
    if (!this.selected) {
      this.showToast('先点选卡牌，再点空格放入暂存')
      return
    }
    if (this.selected.slotIndex != null) {
      this.showToast('暂存区的卡牌不能再搬移')
      return
    }
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
    this.slots[index] = card
    card.slotIndex = index
    card.layer = 100 + index
    audio.tap()
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
      desc: this.cfg.name + '  得分 ' + this.score + '\n剩余卡牌保留，已达到目标',
      buttons: this.makeOverlayButtons('win')
    }
  }

  onFail() {
    if (this.overlay) return
    audio.fail()
    this.overlay = {
      kind: 'fail',
      title: '暂存区已满',
      desc: '底部 7 格已经满了，且没有可消的对子\n可以看广告复活，或重开本局',
      buttons: this.makeOverlayButtons('fail')
    }
  }

  nextLevel() {
    ad.hideBanner()
    this.start('level', this.cfg.level + 1)
  }

  tryRevive() {
    const self = this
    ad.showRewarded('revive').then(function (ok) {
      if (!ok) {
        self.showToast('未看完广告，复活失败')
        return
      }
      self.overlay = null
      if (board.emptySlotIndex(self.slots) < 0) {
        const last = self.slots[self.slots.length - 1]
        if (last) {
          board.clearSlotOf(last, self.slots)
          last.w = last.boardW || last.w
          last.h = last.boardH || last.h
          last.layer = 99
          last.x = self.layout.board.x + 16
          last.y = self.layout.board.y + 16
        }
      }
      board.compactSlots(self.slots, self.layout.slots)
      board.shuffleBoard(self.cards, self.layout.board, self.cfg)
      board.ensureSomePair(self.cards)
      self.showToast('复活成功，已重新堆叠')
      self.afterBoardChange()
    })
  }

  useHint() {
    const self = this
    ad.showRewarded('hint').then(function (ok) {
      if (!ok) {
        self.showToast('未看完广告')
        return
      }
      const pairs = board.clickableSamePairs(self.cards)
      if (!pairs.length) {
        self.showToast('当前没有可消除的对子')
        return
      }
      self.hints = [pairs[0][0].id, pairs[0][1].id]
      self.hintT = 2.8
      self.showToast('已高亮一对可消除卡牌')
    })
  }

  useShuffle() {
    const self = this
    ad.showRewarded('shuffle').then(function (ok) {
      if (!ok) {
        self.showToast('未看完广告')
        return
      }
      board.shuffleBoard(self.cards, self.layout.board, self.cfg)
      self.selected = null
      self.showToast('已重新堆叠')
      self.afterBoardChange()
    })
  }
}

module.exports = PlayScene
