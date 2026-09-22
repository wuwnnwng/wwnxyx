const { readEnv } = require('./env')
const { CONFIG } = require('./config')
const ad = require('./ad')
const audio = require('./audio')
const HomeScene = require('./home')
const PlayScene = require('./play')
const BirdIntroScene = require('./birds')

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
    return { title: '好鸟哥｜二消堆叠，居家小物消消看' }
  })
} catch (e) {}

function currentScene() {
  if (app.scene === 'play') return app.play
  if (app.scene === 'birds') return app.birds
  return app.home
}

const app = {
  env: env,
  scene: 'home',
  home: null,
  play: null,
  birds: null,
  goHome: function () {
    ad.hideBanner()
    this.home.enter()
    this.scene = 'home'
  },
  goPlay: function (mode, level) {
    this.birds.start(mode, level)
    this.scene = 'birds'
  },
  enterPlay: function (mode, level) {
    this.scene = 'play'
    this.play.start(mode, level)
  }
}

app.home = new HomeScene(app)
app.play = new PlayScene(app)
app.birds = new BirdIntroScene(app)

let last = Date.now()
let paused = false

function nextFrame(cb) {
  if (canvas && typeof canvas.requestAnimationFrame === 'function') {
    return canvas.requestAnimationFrame(cb)
  }
  if (typeof wx !== 'undefined' && typeof wx.requestAnimationFrame === 'function') {
    return wx.requestAnimationFrame(cb)
  }
  const g = typeof GameGlobal !== 'undefined' ? GameGlobal : null
  if (g && typeof g.requestAnimationFrame === 'function') {
    return g.requestAnimationFrame(cb)
  }
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(cb)
  }
  return setTimeout(function () { cb(Date.now()) }, 16)
}

function loop() {
  const now = Date.now()
  let dt = (now - last) / 1000
  last = now
  if (dt > 0.05) dt = 0.05
  if (!paused) {
    const scene = currentScene()
    scene.update(dt)
    ctx.clearRect(0, 0, env.width, env.height)
    scene.draw(ctx)
  }
  nextFrame(loop)
}

function touchXY(e) {
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
  if (!t) return null
  const x = typeof t.x === 'number' ? t.x : t.clientX
  const y = typeof t.y === 'number' ? t.y : t.clientY
  if (typeof x !== 'number' || typeof y !== 'number') return null
  return { x: x, y: y }
}

wx.onTouchStart(function (e) {
  audio.unlock()
  const p = touchXY(e)
  if (!p) return
  const scene = currentScene()
  if (scene.onTouchStart) scene.onTouchStart(p.x, p.y)
})

wx.onTouchMove(function (e) {
  const p = touchXY(e)
  if (!p) return
  const scene = currentScene()
  if (scene.onTouchMove) scene.onTouchMove(p.x, p.y)
})

wx.onTouchEnd(function (e) {
  const p = touchXY(e)
  if (!p) return
  const scene = currentScene()
  if (scene.onTouchEnd) scene.onTouchEnd(p.x, p.y)
})

wx.onTouchCancel(function () {
  const scene = currentScene()
  if (scene.onTouchCancel) scene.onTouchCancel()
  else if (scene.pressed) scene.pressed = null
})

wx.onHide(function () {
  paused = true
  audio.pauseBgm()
})
wx.onShow(function () {
  paused = false
  last = Date.now()
  audio.unlock()
  audio.resumeBgm()
})

wx.onError(function (err) {
  console.log('[game error]', err)
})

console.log('[好鸟哥] v' + CONFIG.version + ' ' + env.width + 'x' + env.height)
nextFrame(loop)
