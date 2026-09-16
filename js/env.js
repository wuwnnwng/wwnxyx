function readEnv() {
  const sys = wx.getSystemInfoSync()
  let menu = { top: sys.statusBarHeight || 20, bottom: (sys.statusBarHeight || 20) + 32, height: 32, right: sys.windowWidth - 10, left: sys.windowWidth - 96 }
  try {
    const mb = wx.getMenuButtonBoundingClientRect()
    if (mb && mb.bottom) menu = mb
  } catch (e) {}

  const width = sys.windowWidth
  const height = sys.windowHeight
  const dpr = sys.pixelRatio || 2
  const safeTop = Math.max(menu.bottom + 8, (sys.statusBarHeight || 20) + 36)
  const safeBottom = sys.safeArea ? Math.max(0, height - sys.safeArea.bottom) : 0
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
