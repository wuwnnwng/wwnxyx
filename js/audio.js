const { loadJSON, saveJSON } = require('./env')
const { CONFIG } = require('./config')

const SAMPLE_RATE = 22050
const PCM = {}
const WEB_BUFFERS = {}
const WAV_PATHS = {}
const PLAYERS = {}

let ctx = null
let enabled = true
let unlocked = false
let lastAt = 0
let bgmPlaying = false
let bgmWebSrc = null
let bgmGain = null

function initAudio() {
  enabled = loadJSON(CONFIG.storage.sound, 1) !== 0
  buildAllPcm()
  ensureWebCtx()
  try {
    wx.setInnerAudioOption({ obeyMuteSwitch: false, mixWithOther: true })
  } catch (e) {}
  writeWavFiles()
}

function ensureWebCtx() {
  if (ctx) return ctx
  try {
    if (wx.createWebAudioContext) ctx = wx.createWebAudioContext()
  } catch (e) {
    ctx = null
  }
  if (ctx && ctx.createBuffer) {
    const names = Object.keys(PCM)
    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      try {
        WEB_BUFFERS[name] = floatToAudioBuffer(PCM[name])
      } catch (e) {}
    }
  }
  return ctx
}

function unlock() {
  if (unlocked && ctx && ctx.state === 'running') return
  ensureWebCtx()
  try {
    if (ctx && ctx.resume) ctx.resume()
  } catch (e) {}
  if (ctx && ctx.createBuffer && ctx.createBufferSource) {
    try {
      const buf = ctx.createBuffer(1, 1, SAMPLE_RATE)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start(0)
    } catch (e) {}
  }
  if (enabled) startBgm()
  unlocked = true
}

function isSoundOn() {
  return enabled
}

function toggleSound() {
  enabled = !enabled
  saveJSON(CONFIG.storage.sound, enabled ? 1 : 0)
  if (enabled) {
    unlock()
    startBgm()
  } else {
    stopBgm()
  }
  return enabled
}

function envelope(i, n, attack, release) {
  const a = Math.min(1, i / Math.max(1, attack))
  const r = Math.min(1, (n - 1 - i) / Math.max(1, release))
  return a * r
}

function tone(freq, dur, type, vol, slide) {
  const n = Math.max(1, Math.floor(SAMPLE_RATE * dur))
  const data = new Float32Array(n)
  const v = vol == null ? 0.42 : vol
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const f = slide ? freq + (slide - freq) * (i / n) : freq
    const phase = t * f
    let s = 0
    if (type === 'square') s = (phase % 1) < 0.5 ? 1 : -1
    else if (type === 'sawtooth') s = 2 * (phase % 1) - 1
    else if (type === 'triangle') {
      const x = phase % 1
      s = x < 0.5 ? x * 4 - 1 : 3 - x * 4
    } else {
      s = Math.sin(2 * Math.PI * phase)
    }
    data[i] = s * v * envelope(i, n, 90, 280)
  }
  return data
}

function concat() {
  let total = 0
  for (let i = 0; i < arguments.length; i++) total += arguments[i].length
  const out = new Float32Array(total)
  let o = 0
  for (let i = 0; i < arguments.length; i++) {
    out.set(arguments[i], o)
    o += arguments[i].length
  }
  return out
}

function silence(dur) {
  return new Float32Array(Math.max(1, Math.floor(SAMPLE_RATE * dur)))
}

function mixAt(out, clip, atSec) {
  const start = Math.floor(atSec * SAMPLE_RATE)
  for (let i = 0; i < clip.length; i++) {
    const p = start + i
    if (p >= 0 && p < out.length) out[p] += clip[i]
  }
}

function chirp(startF, endF, dur, vol) {
  const n = Math.max(1, Math.floor(SAMPLE_RATE * dur))
  const data = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 1.15)
    const f = startF + (endF - startF) * (t * t)
    phase += (f * (1 + 0.03 * Math.sin(t * 36))) / SAMPLE_RATE
    data[i] = Math.sin(2 * Math.PI * phase) * vol * env
  }
  return data
}

function coo(freq, dur, vol) {
  const n = Math.max(1, Math.floor(SAMPLE_RATE * dur))
  const data = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const env = envelope(i, n, 180, 900)
    const s = Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(4 * Math.PI * freq * t)
    data[i] = s * 0.55 * vol * env
  }
  return data
}

function airPad(dur, vol) {
  const n = Math.max(1, Math.floor(SAMPLE_RATE * dur))
  const data = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const env = 0.55 + 0.45 * Math.sin(t * 0.7)
    data[i] = (
      Math.sin(2 * Math.PI * 196 * t) * 0.35 +
      Math.sin(2 * Math.PI * 247 * t) * 0.22 +
      Math.sin(2 * Math.PI * 330 * t) * 0.12
    ) * vol * env
  }
  return data
}

function buildBgmPcm() {
  const dur = 10.5
  const out = new Float32Array(Math.floor(SAMPLE_RATE * dur))
  mixAt(out, airPad(dur, 0.07), 0)
  mixAt(out, coo(392, 0.55, 0.16), 0.35)
  mixAt(out, coo(349, 0.5, 0.12), 5.4)
  const tweets = [
    [0.6, 2100, 2800, 0.14],
    [1.15, 1800, 2400, 0.11],
    [1.85, 2400, 3200, 0.13],
    [2.55, 1600, 2100, 0.1],
    [3.2, 2200, 3100, 0.14],
    [3.55, 1900, 2500, 0.09],
    [4.4, 2500, 3400, 0.12],
    [5.15, 1700, 2300, 0.11],
    [6.05, 2100, 2900, 0.13],
    [6.7, 2800, 3600, 0.1],
    [7.45, 1500, 2000, 0.12],
    [8.2, 2300, 3000, 0.13],
    [8.85, 1900, 2600, 0.1],
    [9.5, 2000, 2700, 0.12]
  ]
  for (let i = 0; i < tweets.length; i++) {
    const tw = tweets[i]
    mixAt(out, chirp(tw[1], tw[2], 0.16 + (i % 3) * 0.04, tw[3]), tw[0])
    if (i % 3 === 0) mixAt(out, chirp(tw[1] * 0.92, tw[2] * 0.88, 0.12, tw[3] * 0.7), tw[0] + 0.16)
  }
  let peak = 0.001
  for (let i = 0; i < out.length; i++) {
    const a = Math.abs(out[i])
    if (a > peak) peak = a
  }
  const k = 0.72 / peak
  const fade = Math.floor(SAMPLE_RATE * 0.35)
  for (let i = 0; i < out.length; i++) {
    let g = k
    if (i < fade) g *= i / fade
    if (i > out.length - fade) g *= (out.length - 1 - i) / fade
    out[i] *= g
  }
  return out
}

function buildAllPcm() {
  PCM.tap = tone(620, 0.07, 'triangle', 0.38)
  PCM.match = concat(tone(660, 0.08, 'sine', 0.4), silence(0.02), tone(920, 0.12, 'sine', 0.42))
  PCM.synth = concat(
    tone(480, 0.08, 'sine', 0.38),
    silence(0.02),
    tone(640, 0.08, 'sine', 0.4),
    silence(0.02),
    tone(860, 0.14, 'sine', 0.44)
  )
  PCM.boom = tone(210, 0.28, 'sawtooth', 0.36, 70)
  PCM.win = concat(
    tone(523, 0.1, 'sine', 0.4),
    silence(0.02),
    tone(659, 0.1, 'sine', 0.42),
    silence(0.02),
    tone(784, 0.18, 'sine', 0.46)
  )
  PCM.fail = tone(180, 0.32, 'triangle', 0.4, 90)
  PCM.lock = tone(300, 0.1, 'square', 0.22)
  PCM.bgm = buildBgmPcm()
}

function floatToAudioBuffer(data) {
  const buf = ctx.createBuffer(1, data.length, SAMPLE_RATE)
  buf.getChannelData(0).set(data)
  return buf
}

function pcmToWav(float32) {
  const n = float32.length
  const buffer = new ArrayBuffer(44 + n * 2)
  const view = new DataView(buffer)
  function writeStr(offset, s) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + n * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, n * 2, true)
  let off = 44
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return buffer
}

function writeWavFiles() {
  let root = ''
  try { root = wx.env && wx.env.USER_DATA_PATH } catch (e) { return }
  if (!root) return
  let fs = null
  try { fs = wx.getFileSystemManager() } catch (e) { return }
  const names = Object.keys(PCM)
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const path = root + '/ddxw_' + name + '.wav'
    const data = pcmToWav(PCM[name])
    let ok = false
    try {
      fs.writeFileSync(path, data)
      ok = true
    } catch (e) {
      try {
        fs.writeFile({
          filePath: path,
          data: data,
          success: function () {
            WAV_PATHS[name] = path
            makePlayer(name, path)
          }
        })
      } catch (err) {}
    }
    if (ok) {
      WAV_PATHS[name] = path
      makePlayer(name, path)
    }
  }
}

function makePlayer(name, path) {
  try {
    if (PLAYERS[name]) {
      try { PLAYERS[name].destroy() } catch (e) {}
    }
    const a = wx.createInnerAudioContext()
    a.loop = name === 'bgm'
    a.obeyMuteSwitch = false
    a.volume = name === 'bgm' ? 0.38 : 1
    a.src = path
    a._ready = false
    a.onCanplay(function () { a._ready = true })
    a.onError(function (err) {
      a._ready = false
      console.log('[audio] inner error', name, err)
    })
    PLAYERS[name] = a
  } catch (e) {}
}

function playWeb(name) {
  ensureWebCtx()
  if (!ctx || !WEB_BUFFERS[name] || !ctx.createBufferSource) return false
  try {
    if (ctx.resume) ctx.resume()
    const src = ctx.createBufferSource()
    const g = ctx.createGain()
    g.gain.value = 1
    src.buffer = WEB_BUFFERS[name]
    src.connect(g)
    g.connect(ctx.destination)
    src.start(0)
    return true
  } catch (e) {
    return false
  }
}

function playInner(name) {
  const a = PLAYERS[name]
  if (!a) return false
  try {
    try { a.stop() } catch (e) {}
    a.obeyMuteSwitch = false
    a.volume = 1
    if (typeof a.startTime === 'number') a.startTime = 0
    if (a.seek) a.seek(0)
    a.play()
    return true
  } catch (e) {
    return false
  }
}

function playOneShot(name) {
  const path = WAV_PATHS[name]
  if (!path) return false
  try {
    const a = wx.createInnerAudioContext()
    a.obeyMuteSwitch = false
    a.volume = 1
    a.src = path
    a.onEnded(function () { try { a.destroy() } catch (e) {} })
    a.onError(function () { try { a.destroy() } catch (e) {} })
    a.play()
    return true
  } catch (e) {
    return false
  }
}

function play(name) {
  if (!enabled || name === 'bgm') return
  unlock()
  const now = Date.now()
  if (now - lastAt < 30 && name === 'tap') return
  lastAt = now
  const player = PLAYERS[name]
  if (player && player._ready) {
    playInner(name)
    return
  }
  playWeb(name)
  if (!playInner(name)) playOneShot(name)
}

function stopBgmWeb() {
  if (bgmWebSrc) {
    try { bgmWebSrc.stop() } catch (e) {}
    bgmWebSrc = null
  }
  bgmGain = null
}

function startBgmWeb() {
  ensureWebCtx()
  if (!ctx || !WEB_BUFFERS.bgm || !ctx.createBufferSource) return false
  try {
    stopBgmWeb()
    if (ctx.resume) ctx.resume()
    const src = ctx.createBufferSource()
    const g = ctx.createGain()
    g.gain.value = 0.38
    src.buffer = WEB_BUFFERS.bgm
    src.loop = true
    src.connect(g)
    g.connect(ctx.destination)
    src.start(0)
    bgmWebSrc = src
    bgmGain = g
    return true
  } catch (e) {
    return false
  }
}

function startBgm() {
  if (!enabled) return
  const a = PLAYERS.bgm
  if (a) {
    try {
      a.loop = true
      a.volume = 0.38
      a.play()
      bgmPlaying = true
      return
    } catch (e) {}
  }
  if (startBgmWeb()) bgmPlaying = true
}

function stopBgm() {
  bgmPlaying = false
  const a = PLAYERS.bgm
  if (a) {
    try { a.stop() } catch (e) {}
    try { if (a.pause) a.pause() } catch (e) {}
  }
  stopBgmWeb()
}

function pauseBgm() {
  const a = PLAYERS.bgm
  if (a) {
    try { a.pause() } catch (e) {}
  }
  if (ctx && ctx.suspend) {
    try { ctx.suspend() } catch (e) {}
  }
}

function resumeBgm() {
  if (!enabled) return
  try {
    if (ctx && ctx.resume) ctx.resume()
  } catch (e) {}
  startBgm()
}

function tap() { play('tap') }
function match() { play('match') }
function synth() { play('synth') }
function boom() { play('boom') }
function win() { play('win') }
function fail() { play('fail') }
function lock() { play('lock') }

module.exports = {
  initAudio: initAudio,
  unlock: unlock,
  isSoundOn: isSoundOn,
  toggleSound: toggleSound,
  startBgm: startBgm,
  stopBgm: stopBgm,
  pauseBgm: pauseBgm,
  resumeBgm: resumeBgm,
  tap: tap,
  match: match,
  synth: synth,
  boom: boom,
  win: win,
  fail: fail,
  lock: lock
}
