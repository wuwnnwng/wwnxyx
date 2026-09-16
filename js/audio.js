const { loadJSON, saveJSON } = require('./env')
const { CONFIG } = require('./config')

let ctx = null
let enabled = true
let lastAt = 0

function initAudio() {
  enabled = loadJSON(CONFIG.storage.sound, 1) !== 0
  try {
    if (wx.createWebAudioContext) ctx = wx.createWebAudioContext()
  } catch (e) {
    ctx = null
  }
}

function isSoundOn() {
  return enabled
}

function toggleSound() {
  enabled = !enabled
  saveJSON(CONFIG.storage.sound, enabled ? 1 : 0)
  return enabled
}

function beep(freq, dur, type, gain) {
  if (!enabled || !ctx) return
  const t = ctx.currentTime
  if (t - lastAt < 0.03) return
  lastAt = t
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type || 'sine'
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain || 0.05, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + dur)
}

function tap() { beep(520, 0.08, 'triangle', 0.04) }
function match() {
  beep(620, 0.1, 'sine', 0.05)
  setTimeout(function () { beep(880, 0.12, 'sine', 0.05) }, 70)
}
function synth() {
  beep(480, 0.1, 'sine', 0.05)
  setTimeout(function () { beep(640, 0.1, 'sine', 0.05) }, 80)
  setTimeout(function () { beep(820, 0.14, 'sine', 0.05) }, 160)
}
function boom() { beep(180, 0.22, 'sawtooth', 0.06) }
function win() {
  beep(523, 0.12, 'sine', 0.05)
  setTimeout(function () { beep(659, 0.12, 'sine', 0.05) }, 100)
  setTimeout(function () { beep(784, 0.2, 'sine', 0.05) }, 200)
}
function fail() { beep(220, 0.25, 'triangle', 0.05) }
function lock() { beep(340, 0.1, 'square', 0.03) }

module.exports = {
  initAudio: initAudio,
  isSoundOn: isSoundOn,
  toggleSound: toggleSound,
  tap: tap,
  match: match,
  synth: synth,
  boom: boom,
  win: win,
  fail: fail,
  lock: lock
}
