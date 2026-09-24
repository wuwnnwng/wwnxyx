function readSystem() {
  let sys = {}
  try { sys = wx.getSystemInfoSync() || {} } catch (e) {}
  try {
    if (typeof wx.getWindowInfo === 'function') {
      const win = wx.getWindowInfo()
      if (win) {
        sys.pixelRatio = win.pixelRatio || sys.pixelRatio
        sys.screenWidth = win.screenWidth || sys.screenWidth
        sys.screenHeight = win.screenHeight || sys.screenHeight
        sys.windowWidth = win.windowWidth || sys.windowWidth
        sys.windowHeight = win.windowHeight || sys.windowHeight
        sys.statusBarHeight = win.statusBarHeight || sys.statusBarHeight
        sys.safeArea = win.safeArea || sys.safeArea
        if (typeof win.screenTop === 'number') sys.screenTop = win.screenTop
      }
    }
  } catch (e) {}
  return sys
}

function deviceHasHomeIndicator(sys, screenH) {
  const model = String(sys.model || '')
  const system = String(sys.system || '')
  const platform = String(sys.platform || '').toLowerCase()
  const iosLike = platform === 'ios' || /ios/i.test(system) || /iphone|ipad/i.test(model)
  if (!iosLike) return false
  if (screenH >= 812) return true
  return /iPhone X|iPhone 1[1-9]|iPhone [2-9]\d/i.test(model)
}

function readSafeBottom(sys, height) {
  const screenH = sys.screenHeight || height
  const screenTop = typeof sys.screenTop === 'number' ? sys.screenTop : 0
  let inset = 0
  const area = sys.safeArea
  if (area && typeof area.bottom === 'number') {
    let bottom = area.bottom
    if (bottom > screenH + 2 && sys.pixelRatio > 1) bottom = bottom / sys.pixelRatio
    const fromWindow = Math.max(0, screenTop + height - bottom)
    const fromScreen = Math.max(0, screenH - bottom)
    inset = height >= screenH - 1 ? Math.max(fromWindow, fromScreen) : fromWindow
  }
  if (inset < 1 && deviceHasHomeIndicator(sys, screenH)) inset = 34
  return inset
}

function readEnv() {
  const sys = readSystem()
  let menu = { top: sys.statusBarHeight || 20, bottom: (sys.statusBarHeight || 20) + 32, height: 32, right: sys.windowWidth - 10, left: sys.windowWidth - 96 }
  try {
    const mb = wx.getMenuButtonBoundingClientRect()
    if (mb && mb.bottom) menu = mb
  } catch (e) {}

  const width = sys.windowWidth
  const height = sys.windowHeight
  const dpr = sys.pixelRatio || 2
  const safeTop = Math.max(menu.bottom + 8, (sys.statusBarHeight || 20) + 36)
  const safeBottom = readSafeBottom(sys, height)
  const bannerH = 86

  const cardW = Math.max(52, Math.min(70, Math.floor(width / 5.6)))
  const cardH = Math.round(cardW * 1.22)

  return {
    width: width,
    height: height,
    dpr: dpr,
    statusBar: sys.statusBarHeight || 20,
    menu: menu,
    safeTop: safeTop,
    safeBottom: safeBottom,
    bannerH: bannerH,
    cardW: cardW,
    cardH: cardH,
    platform: sys.platform
  }
}

function loadJSON(key, fallback) {
  try {
    const v = wx.getStorageSync(key)
    if (v === '' || v === undefined || v === null) return fallback
    return v
  } catch (e) {
    return fallback
  }
}

function saveJSON(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (e) {}
}

module.exports = {
  readEnv: readEnv,
  loadJSON: loadJSON,
  saveJSON: saveJSON
}
