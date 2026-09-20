/**
 * 好鸟哥 - 全局配置
 * 上线前请把 appid / 广告位 ID 换成流量主后台的真实值
 */
const CONFIG = {
  name: '好鸟哥',
  version: '1.2.0',

  storage: {
    level: 'ddxw_level',
    endlessBest: 'ddxw_endless_best',
    sound: 'ddxw_sound'
  },

  /**
   * 在 微信公众平台 → 流量主 → 广告管理 创建后粘贴到这里
   * 激励：提示 / 洗牌 / 失败复活
   * 插屏：仅通关结束
   * Banner：对局页底部常驻
   */
  ad: {
    rewarded: 'adunit-0000000000000001',
    interstitial: 'adunit-0000000000000002',
    banner: 'adunit-0000000000000003'
  },

  card: {
    coverOverlap: 0.28,
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
    slotCount: 7
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

/**
 * 市面堆叠消常见布局：底层满格多行多列，奇数层错半格压在缝上。
 * 第一关只铺两排；之后加列、加行、再加层。
 */
function getStackPlan(level) {
  const n = Math.max(1, level | 0)
  if (n <= 1) return { cols: 4, rows: 2, layers: 2 }
  if (n === 2) return { cols: 4, rows: 3, layers: 2 }
  if (n === 3) return { cols: 5, rows: 3, layers: 2 }
  if (n === 4) return { cols: 5, rows: 3, layers: 3 }
  if (n === 5) return { cols: 5, rows: 4, layers: 2 }
  if (n === 6) return { cols: 5, rows: 4, layers: 3 }
  if (n === 7) return { cols: 6, rows: 4, layers: 2 }
  if (n <= 9) return { cols: 6, rows: 4, layers: 3 }
  if (n <= 12) return { cols: 6, rows: 5, layers: 2 }
  return { cols: 6, rows: 5, layers: 3 }
}

function layerCells(cols, rows, layer) {
  const brick = layer % 2 === 1
  return {
    cols: Math.max(2, cols - layer),
    rows: Math.max(1, rows - layer),
    brick: brick
  }
}

function estimateSlots(plan) {
  let n = 0
  for (let L = 0; L < plan.layers; L++) {
    const g = layerCells(plan.cols, plan.rows, L)
    n += g.cols * g.rows
  }
  if (n % 2) n -= 1
  return n
}

function getLevelConfig(level) {
  const n = Math.max(1, level | 0)
  const plan = getStackPlan(n)
  const types = Math.min(4 + Math.floor((n - 1) / 2), 8)
  const locks = n <= 1 ? 0 : Math.min(1 + Math.floor((n - 2) / 2), 8)
  const advancedPairs = n < 3 ? 0 : Math.min(1 + Math.floor((n - 3) / 4), 2)
  const slots = estimateSlots(plan)
  const pairs = Math.max(3, Math.floor(slots / 2))
  const target = Math.round(CONFIG.score.pair * pairs * (0.42 + Math.min(n, 12) * 0.025))
  return {
    level: n,
    name: LEVEL_NAMES[(n - 1) % LEVEL_NAMES.length],
    types: types,
    cols: plan.cols,
    rows: plan.rows,
    layers: plan.layers,
    pairCount: types,
    locks: locks,
    advancedPairs: advancedPairs,
    synthTypes: 0,
    target: target
  }
}

function getEndlessConfig() {
  const plan = { cols: 5, rows: 4, layers: 3 }
  return {
    level: 0,
    name: '无尽模式',
    types: 6,
    cols: plan.cols,
    rows: plan.rows,
    layers: plan.layers,
    pairCount: 6,
    locks: 2,
    advancedPairs: 1,
    synthTypes: 0,
    target: 0
  }
}

module.exports = {
  CONFIG: CONFIG,
  ITEMS: ITEMS,
  LEVEL_NAMES: LEVEL_NAMES,
  getStackPlan: getStackPlan,
  layerCells: layerCells,
  estimateSlots: estimateSlots,
  getLevelConfig: getLevelConfig,
  getEndlessConfig: getEndlessConfig
}
