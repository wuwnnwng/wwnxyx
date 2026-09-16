const { CONFIG } = require('./config')

let rewardedAd = null
let interstitialAd = null
let bannerAd = null
let bannerShown = false
let rewardedResolve = null
let rewardedReason = 'move'
let inited = false

let mock = null

const REASON_TEXT = {
  move: '观看激励视频，获得额外搬移次数',
  hint: '观看激励视频，获得一次提示',
  shuffle: '观看激励视频，重新洗牌',
  revive: '观看激励视频，复活并继续本局'
}

function initAds() {
  if (inited) return
  inited = true
  try {
    rewardedAd = wx.createRewardedVideoAd({ adUnitId: CONFIG.ad.rewarded })
    rewardedAd.onClose(function (res) {
      const ok = !!(res && res.isEnded)
      finishRewarded(ok)
      try { rewardedAd.load() } catch (e) {}
    })
    rewardedAd.onError(function (err) {
      console.log('[ad] rewarded error', err)
    })
    rewardedAd.load().catch(function () {})
  } catch (e) {
    rewardedAd = null
    console.log('[ad] rewarded create failed', e)
  }

  try {
    interstitialAd = wx.createInterstitialAd({ adUnitId: CONFIG.ad.interstitial })
    interstitialAd.onError(function (err) {
      console.log('[ad] interstitial error', err)
    })
    interstitialAd.load().catch(function () {})
  } catch (e) {
    interstitialAd = null
  }
}

function finishRewarded(ok) {
  if (rewardedResolve) {
    const fn = rewardedResolve
    rewardedResolve = null
    fn(ok)
  }
}

function startMock(reason, resolve) {
  if (!CONFIG.mockAdWhenUnavailable) {
    resolve(false)
    return
  }
  mock = {
    reason: reason,
    title: REASON_TEXT[reason] || '观看激励视频',
    t: 0,
    dur: 2.4,
    done: false,
    resolve: resolve
  }
}

function showRewarded(reason) {
  return new Promise(function (resolve) {
    if (rewardedResolve || mock) {
      resolve(false)
      return
    }
    if (!rewardedAd) {
      startMock(reason, resolve)
      return
    }
    rewardedReason = reason
    rewardedResolve = resolve
    const failToMock = function () {
      rewardedResolve = null
      startMock(reason, resolve)
    }
    rewardedAd.show().catch(function () {
      rewardedAd.load()
        .then(function () { return rewardedAd.show() })
        .catch(failToMock)
    })
  })
}

function showInterstitial() {
  if (!interstitialAd) return
  interstitialAd.show().catch(function () {
    interstitialAd.load()
      .then(function () { return interstitialAd.show() })
      .catch(function (err) {
        console.log('[ad] interstitial show failed', err)
      })
  })
  setTimeout(function () {
    try { interstitialAd.load() } catch (e) {}
  }, 800)
}

function showBanner(env) {
  hideBanner()
  try {
    bannerAd = wx.createBannerAd({
      adUnitId: CONFIG.ad.banner,
      adIntervals: 30,
      style: {
        left: 0,
        top: env.height - env.bannerH,
        width: env.width
      }
    })
    bannerAd.onError(function (err) {
      console.log('[ad] banner error', err)
      bannerShown = false
    })
    bannerAd.onResize(function (res) {
      try {
        bannerAd.style.top = env.height - res.height
        bannerAd.style.left = (env.width - res.width) / 2
      } catch (e) {}
    })
    bannerAd.show().then(function () {
      bannerShown = true
    }).catch(function () {
      bannerShown = false
    })
  } catch (e) {
    bannerAd = null
    bannerShown = false
  }
}

function hideBanner() {
  bannerShown = false
  if (bannerAd) {
    try { bannerAd.hide() } catch (e) {}
    try { bannerAd.destroy() } catch (e) {}
    bannerAd = null
  }
}

function isBannerLive() {
  return bannerShown
}

function updateMock(dt) {
  if (!mock) return
  if (mock.done) return
  mock.t += dt
  if (mock.t >= mock.dur) {
    mock.done = true
  }
}

function drawMock(ctx, env) {
  if (!mock) return false
  const w = env.width
  const h = env.height
  ctx.save()
  ctx.fillStyle = 'rgba(28, 25, 23, 0.78)'
  ctx.fillRect(0, 0, w, h)

  const pw = Math.min(300, w - 48)
  const ph = 220
  const px = (w - pw) / 2
  const py = (h - ph) / 2 - 20
  roundRect(ctx, px, py, pw, ph, 18)
  ctx.fillStyle = '#FFFBF5'
  ctx.fill()

  ctx.fillStyle = '#3D405B'
  ctx.font = 'bold 18px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('激励视频（开发模拟）', w / 2, py + 36)

  ctx.font = '13px sans-serif'
  ctx.fillStyle = '#6D6A66'
  wrapText(ctx, mock.title, w / 2, py + 72, pw - 40, 18)

  const bw = pw - 48
  const bx = px + 24
  const by = py + 120
  roundRect(ctx, bx, by, bw, 10, 5)
  ctx.fillStyle = '#EDE6DC'
  ctx.fill()
  const p = Math.min(1, mock.t / mock.dur)
  roundRect(ctx, bx, by, bw * p, 10, 5)
  ctx.fillStyle = '#E07A5F'
  ctx.fill()

  const label = mock.done ? '领取奖励' : '播放中 ' + Math.ceil(Math.max(0, mock.dur - mock.t)) + 's'
  const btnY = py + ph - 52
  roundRect(ctx, w / 2 - 70, btnY, 140, 36, 18)
  ctx.fillStyle = mock.done ? '#E07A5F' : '#CABCAB'
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 15px sans-serif'
  ctx.fillText(label, w / 2, btnY + 18)

  ctx.restore()
  return true
}

function tapMock(x, y, env) {
  if (!mock) return false
  if (!mock.done) return true
  const w = env.width
  const h = env.height
  const ph = 220
  const py = (h - ph) / 2 - 20
  const btnY = py + ph - 52
  if (x >= w / 2 - 70 && x <= w / 2 + 70 && y >= btnY && y <= btnY + 36) {
    const resolve = mock.resolve
    mock = null
    resolve(true)
  }
  return true
}

function hasMock() {
  return !!mock
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const chars = text.split('')
  let line = ''
  let yy = y
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i]
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy)
      line = chars[i]
      yy += lh
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, yy)
}

module.exports = {
  initAds: initAds,
  showRewarded: showRewarded,
  showInterstitial: showInterstitial,
  showBanner: showBanner,
  hideBanner: hideBanner,
  isBannerLive: isBannerLive,
  updateMock: updateMock,
  drawMock: drawMock,
  tapMock: tapMock,
  hasMock: hasMock
}
