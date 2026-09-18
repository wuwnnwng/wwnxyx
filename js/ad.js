const { CONFIG } = require('./config')

let rewardedAd = null
let interstitialAd = null
let bannerAd = null
let bannerShown = false
let rewardedResolve = null
let inited = false

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

function showRewarded(reason) {
  return new Promise(function (resolve) {
    if (rewardedResolve) {
      resolve(false)
      return
    }
    if (!rewardedAd) {
      resolve(false)
      return
    }
    rewardedResolve = resolve
    rewardedAd.show().catch(function () {
      rewardedAd.load()
        .then(function () { return rewardedAd.show() })
        .catch(function () {
          rewardedResolve = null
          resolve(false)
        })
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

module.exports = {
  initAds: initAds,
  showRewarded: showRewarded,
  showInterstitial: showInterstitial,
  showBanner: showBanner,
  hideBanner: hideBanner,
  isBannerLive: isBannerLive
}
