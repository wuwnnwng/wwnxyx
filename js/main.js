const { readEnv } = require('./env')
const { CONFIG } = require('./config')
const ad = require('./ad')
const audio = require('./audio')
const HomeScene = require('./home')
const PlayScene = require('./play')

const env = readEnv()
const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')
canvas.width = env.width * env.dpr
canvas.height = env.height * env.dpr
ctx.scale(env.dpr, env.dpr)

audio.initAudio()
ad.initAds()

try {
  wx.setKeepScreenOn({ keepScreenOn: true })
} catch (e) {}

try {
  wx.showShareMenu({ withShareTicket: false, menus: ['shareAppMessage', 'shareTimeline'] })
} catch (e) {}

try {
  wx.onShareAppMessage(function () {
    return { title: '叠叠消物｜二消堆叠，居家小物消消看' }
  })
} catch (e) {}

const app = {
  env: env,
  scene: 'home',
  home: null,
  play: null,
  goHome: function () {
    ad.hideBanner()
    this.scene = 'home'
  },
  goPlay: function (mode, level) {
    this.scene = 'play'
    this.play.start(mode, level)
  }
}

app.home = new HomeScene(app)
app.play = new PlayScene(app)

let last = Date.now()
let paused = false

function loop() {
  const now = Date.now()
  let dt = (now - last) / 1000
  last = now
  if (dt > 0.05) dt = 0.05
  if (!paused) {
    const scene = app.scene === 'play' ? app.play : app.home
    scene.update(dt)
    ad.updateMock(dt)
    ctx.clearRect(0, 0, env.width, env.height)
    scene.draw(ctx)
    ad.drawMock(ctx, env)
  }
  requestAnimationFrame(loop)
}

function touchXY(e) {
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
  if (!t) return null
  return { x: t.clientX, y: t.clientY }
}

wx.onTouchStart(function (e) {
  const p = touchXY(e)
  if (!p) return
  if (ad.hasMock()) return
  const scene = app.scene === 'play' ? app.play : app.home
  if (scene.onTouchStart) scene.onTouchStart(p.x, p.y)
})

wx.onTouchEnd(function (e) {
  const p = touchXY(e)
  if (!p) return
  if (ad.hasMock()) {
    ad.tapMock(p.x, p.y, env)
    return
  }
  const scene = app.scene === 'play' ? app.play : app.home
  if (scene.onTouchEnd) scene.onTouchEnd(p.x, p.y)
})

wx.onTouchCancel(function () {
  const scene = app.scene === 'play' ? app.play : app.home
  if (scene.pressed) scene.pressed = null
})

wx.onHide(function () { paused = true })
wx.onShow(function () {
  paused = false
  last = Date.now()
})

wx.onError(function (err) {
  console.log('[game error]', err)
})

console.log('[叠叠消物] v' + CONFIG.version + ' ' + env.width + 'x' + env.height)
loop()
