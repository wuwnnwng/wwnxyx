/**
 * 叠叠消物 - 全局配置
 * 上线前请把 appid / 广告位 ID 换成流量主后台的真实值
 */
const CONFIG = {
  name: '叠叠消物',
  version: '1.0.0',
  /** 开发者工具 / 未配置广告位时，用模拟广告走完激励流程，方便自测。正式上线改为 false */
  mockAdWhenUnavailable: true,

  storage: {
    level: 'ddxw_level',
    endlessBest: 'ddxw_endless_best',
    sound: 'ddxw_sound'
  },

  /**
   * 在 微信公众平台 → 流量主 → 广告管理 创建后粘贴到这里
   * 激励：搬移 / 提示 / 洗牌 / 复活
   * 插屏：仅通关结束
   * Banner：对局页底部常驻
   */
  ad: {
    rewarded: 'adunit-0000000000000001',
    interstitial: 'adunit-0000000000000002',
    banner: 'adunit-0000000000000003'
  },

  card: {
    coverOverlap: 0.14,
    adjacentPad: 10,
    explodeRadius: 118,
    explodeMax: 4
  },

  score: {
    pair: 120,
    comboStep: 0.25,
    synth: 80,
    advancedPair: 480,
    explodeEach: 90
  },

  move: {
    freePerRound: 1,
    extraPerAd: 2,
    reviveMoves: 2,
    slotCount: 2
  }
}

const ITEMS = [
  { id: 0, name: '杯子', key: 'cup', color: '#E07A5F', deep: '#C45C42' },
  { id: 1, name: '书本', key: 'book', color: '#3D405B', deep: '#2B2D42' },
  { id: 2, name: '剪刀', key: 'scissors', color: '#81B29A', deep: '#5E8C76' },
  { id: 3, name: '钥匙', key: 'key', color: '#E9C46A', deep: '#D4A017' },
  { id: 4, name: '花盆', key: 'pot', color: '#6D8B74', deep: '#4F6F57' },
  { id: 5, name: '毛巾', key: 'towel', color: '#E8A0A0', deep: '#D07A7A' },
  { id: 6, name: '时钟', key: 'clock', color: '#7EB6D9', deep: '#5A94B8' },
  { id: 7, name: '台灯', key: 'lamp', color: '#F2CC8F', deep: '#D9A85C' },
  { id: 8, name: '瓶子', key: 'bottle', color: '#9B8EC4', deep: '#7A6DA6' },
  { id: 9, name: '勺子', key: 'spoon', color: '#C9ADA7', deep: '#A88C86' }
]

const LEVEL_NAMES = [
  '客厅一角', '书桌整理', '厨房抽屉', '阳台花架', '玄关钥匙',
  '衣柜叠放', '茶几收纳', '浴室毛巾', '书架间隙', '窗台绿植',
  '餐边柜', '工具箱', '床头柜', '储物间', '洗衣角'
]

function getLevelConfig(level) {
  const n = Math.max(1, level | 0)
  const types = Math.min(5 + Math.floor((n - 1) / 3), 8)
  const layers = Math.min(3 + Math.floor((n - 1) / 2), 6)
  const locks = n <= 1 ? 0 : Math.min(Math.floor(n / 2), 6)
  const synthTypes = n >= 3 ? Math.min(1 + Math.floor((n - 3) / 5), 2) : 0
  const target = 260 + (n - 1) * 120 + synthTypes * 100
  return {
    level: n,
    name: LEVEL_NAMES[(n - 1) % LEVEL_NAMES.length],
    types: types,
    layers: layers,
    pairCount: types,
    locks: locks,
    synthTypes: synthTypes,
    target: target,
    freeMoves: CONFIG.move.freePerRound
  }
}

function getEndlessConfig() {
  return {
    level: 0,
    name: '无尽模式',
    types: 6,
    layers: 4,
    pairCount: 6,
    locks: 2,
    synthTypes: 1,
    target: 0,
    freeMoves: CONFIG.move.freePerRound
  }
}

module.exports = {
  CONFIG: CONFIG,
  ITEMS: ITEMS,
  LEVEL_NAMES: LEVEL_NAMES,
  getLevelConfig: getLevelConfig,
  getEndlessConfig: getEndlessConfig
}
