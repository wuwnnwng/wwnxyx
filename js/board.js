const { CONFIG, ITEMS, getLevelConfig, getEndlessConfig } = require('./config')
const { shuffle, randInt, rectsOverlapArea, inflate, dist, now } = require('./utils')

let uid = 1

function typeKey(card) {
  return card.type + (card.advanced ? '_adv' : '')
}

function activeCards(cards) {
  const list = []
  for (let i = 0; i < cards.length; i++) {
    if (!cards[i].removed) list.push(cards[i])
  }
  return list
}

function isCovered(card, cards) {
  if (card.slotIndex != null) return false
  const minArea = card.w * card.h * CONFIG.card.coverOverlap
  for (let i = 0; i < cards.length; i++) {
    const o = cards[i]
    if (o.removed || o.id === card.id) continue
    if (o.slotIndex != null) continue
    if (o.layer <= card.layer) continue
    if (rectsOverlapArea(card, o) >= minArea) return true
  }
  return false
}

function isFree(card, cards) {
  if (card.removed || card.locked) return false
  return !isCovered(card, cards)
}

function isAdjacent(a, b) {
  const pad = CONFIG.card.adjacentPad
  return rectsOverlapArea(inflate(a, pad), b) > 0
}

function makeCard(type, layer, extra) {
  const c = {
    id: uid++,
    type: type,
    advanced: false,
    locked: false,
    lockHp: 2,
    layer: layer,
    x: 0,
    y: 0,
    w: 60,
    h: 72,
    slotIndex: null,
    removed: false,
    scale: 1,
    shake: 0,
    glow: 0,
    born: now(),
    boardW: 60,
    boardH: 72
  }
  if (extra) {
    for (const k in extra) c[k] = extra[k]
  }
  return c
}

function layoutPile(cards, box, cardW, cardH, layers) {
  const n = cards.length
  const layerCount = Math.max(1, layers)
  const perLayer = Math.ceil(n / layerCount)
  const cols = perLayer > 6 ? 5 : 4
  const rows = Math.max(3, Math.ceil(perLayer / cols))
  const gapX = cardW * 0.66
  const gapY = cardH * 0.56
  const gridW = (cols - 1) * gapX + cardW
  const gridH = (rows - 1) * gapY + cardH
  const ox = box.x + (box.w - gridW) / 2
  const oy = box.y + Math.max(8, (box.h - gridH) / 2)

  const shuffled = shuffle(cards)
  for (let i = 0; i < shuffled.length; i++) {
    const c = shuffled[i]
    const layer = Math.min(layerCount - 1, Math.floor(i / perLayer))
    c.layer = layer
    const idx = i % perLayer
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const jx = ((c.id * 13 + layer * 7) % 7) - 3
    const jy = ((c.id * 9 + layer * 5) % 5) - 2
    c.x = ox + col * gapX + layer * 6 + jx
    c.y = oy + row * gapY + layer * 5 + jy
    c.w = cardW
    c.h = cardH
    if (c.x < box.x) c.x = box.x
    if (c.x + c.w > box.x + box.w) c.x = box.x + box.w - c.w
    if (c.y < box.y) c.y = box.y
    if (c.y + c.h > box.y + box.h) c.y = box.y + box.h - c.h
  }
}

function buildBag(cfg) {
  const bag = []
  for (let i = 0; i < cfg.types; i++) {
    bag.push(i, i)
  }
  const extras = []
  for (let s = 0; s < cfg.synthTypes; s++) {
    const type = s % cfg.types
    for (let k = 0; k < 6; k++) extras.push(type)
  }
  return { bag: bag, extras: extras }
}

function limitUnlockedPerType(cards, maxUnlocked) {
  const groups = {}
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    if (c.removed || c.advanced) continue
    if (!groups[c.type]) groups[c.type] = []
    groups[c.type].push(c)
  }
  for (const t in groups) {
    const list = groups[t]
    let unlocked = 0
    for (let i = 0; i < list.length; i++) {
      if (list[i].locked) continue
      unlocked++
      if (unlocked > maxUnlocked) {
        list[i].locked = true
        list[i].lockHp = 2
      }
    }
  }
}

function assignLocks(cards, lockCount, extraIds) {
  const extraSet = {}
  for (let i = 0; i < extraIds.length; i++) extraSet[extraIds[i]] = true

  for (let i = 0; i < cards.length; i++) {
    if (extraSet[cards[i].id]) {
      cards[i].locked = true
      cards[i].lockHp = 2
    }
  }
  let unlockedCount = 0
  for (let i = 0; i < cards.length; i++) {
    if (!cards[i].locked) unlockedCount++
  }
  const add = Math.min(lockCount, Math.max(0, unlockedCount - 6))
  let maxLayer = 0
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].layer > maxLayer) maxLayer = cards[i].layer
  }
  const candidates = shuffle(cards.filter(function (c) {
    return !c.locked && c.layer < maxLayer
  }))
  for (let i = 0; i < candidates.length && i < add; i++) {
    candidates[i].locked = true
    candidates[i].lockHp = 2
  }
  const topCards = cards.filter(function (c) { return c.layer === maxLayer })
  let topFree = 0
  for (let i = 0; i < topCards.length; i++) {
    if (!topCards[i].locked) topFree++
  }
  if (topFree >= 2) {
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].locked && cards[i].layer === maxLayer) {
        cards[i].layer = Math.max(0, maxLayer - 1)
      }
    }
  }
}

function ensureOpeningMatch(cards) {
  if (clickableSamePairs(cards).length) return
  let maxLayer = 0
  for (let i = 0; i < cards.length; i++) {
    if (!cards[i].removed && cards[i].layer > maxLayer) maxLayer = cards[i].layer
  }
  const pool = []
  for (let i = 0; i < cards.length; i++) {
    if (!cards[i].removed && cards[i].slotIndex == null) pool.push(cards[i])
  }
  if (pool.length < 2) return
  pool[0].locked = false
  pool[1].locked = false
  pool[0].advanced = false
  pool[1].advanced = false
  pool[0].layer = maxLayer + 1
  pool[1].layer = maxLayer + 1
  pool[1].type = pool[0].type
}

function createBoard(cfg, box, cardW, cardH) {
  uid = 1
  const pack = buildBag(cfg)
  const cards = []
  for (let i = 0; i < pack.bag.length; i++) {
    cards.push(makeCard(pack.bag[i], 0))
  }
  const extraIds = []
  for (let i = 0; i < pack.extras.length; i++) {
    const c = makeCard(pack.extras[i], 0)
    cards.push(c)
    extraIds.push(c.id)
  }
  layoutPile(cards, box, cardW, cardH, cfg.layers)
  for (let i = 0; i < cards.length; i++) {
    cards[i].boardW = cards[i].w
    cards[i].boardH = cards[i].h
  }
  limitUnlockedPerType(cards, 2)
  assignLocks(cards, cfg.locks, extraIds)
  ensureOpeningMatch(cards)
  return cards
}

function findCardAt(cards, x, y) {
  const list = activeCards(cards).slice().sort(function (a, b) {
    const sa = a.slotIndex != null ? 1000 : 0
    const sb = b.slotIndex != null ? 1000 : 0
    return (b.layer + sb) - (a.layer + sa)
  })
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (x >= c.x && y >= c.y && x <= c.x + c.w && y <= c.y + c.h) return c
  }
  return null
}

function clickableSamePairs(cards) {
  const free = []
  for (let i = 0; i < cards.length; i++) {
    if (isFree(cards[i], cards)) free.push(cards[i])
  }
  const map = {}
  for (let i = 0; i < free.length; i++) {
    const k = typeKey(free[i])
    if (!map[k]) map[k] = []
    map[k].push(free[i])
  }
  const pairs = []
  for (const k in map) {
    if (map[k].length >= 2) {
      pairs.push([map[k][0], map[k][1]])
    }
  }
  return pairs
}

function canMatch(a, b) {
  if (!a || !b || a.id === b.id) return false
  if (a.removed || b.removed || a.locked || b.locked) return false
  return a.type === b.type && !!a.advanced === !!b.advanced
}

function applyLockDamage(cards, removedList) {
  const unlocked = []
  for (let i = 0; i < cards.length; i++) {
    const lock = cards[i]
    if (lock.removed || !lock.locked) continue
    let hits = 0
    for (let j = 0; j < removedList.length; j++) {
      if (isAdjacent(lock, removedList[j])) hits++
    }
    if (hits > 0) {
      lock.lockHp -= hits
      lock.glow = 1
      if (lock.lockHp <= 0) {
        lock.locked = false
        lock.lockHp = 0
        unlocked.push(lock)
      }
    }
  }
  return unlocked
}

function findSynthesisGroups(cards) {
  const map = {}
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    if (c.removed || c.locked || c.advanced) continue
    if (!map[c.type]) map[c.type] = []
    map[c.type].push(c)
  }
  const groups = []
  for (const t in map) {
    const list = map[t]
    while (list.length >= 4) {
      groups.push(list.splice(0, 4))
    }
  }
  return groups
}

function synthesizeGroup(group, cards, box) {
  let best = group[0]
  for (let i = 1; i < group.length; i++) {
    if (group[i].layer >= best.layer) best = group[i]
  }
  const nx = best.x
  const ny = best.y
  const layer = best.layer
  const slotIndex = best.slotIndex
  for (let i = 0; i < group.length; i++) {
    group[i].removed = true
    group[i].slotIndex = null
  }
  const adv = makeCard(best.type, layer, {
    advanced: true,
    x: nx,
    y: ny,
    w: best.w,
    h: best.h,
    slotIndex: slotIndex
  })
  if (adv.x < box.x) adv.x = box.x
  if (adv.y < box.y) adv.y = box.y
  cards.push(adv)
  return adv
}

function explodeAround(cards, ax, ay) {
  const victims = activeCards(cards)
    .map(function (c) {
      return { c: c, d: dist(ax, ay, c.x + c.w / 2, c.y + c.h / 2) }
    })
    .filter(function (o) {
      return o.d <= CONFIG.card.explodeRadius
    })
    .sort(function (a, b) { return a.d - b.d })

  const cleared = []
  for (let i = 0; i < victims.length && cleared.length < CONFIG.card.explodeMax; i++) {
    const c = victims[i].c
    if (c.locked) {
      c.lockHp -= 1
      c.glow = 1
      if (c.lockHp <= 0) {
        c.locked = false
        c.lockHp = 0
      }
      continue
    }
    c.removed = true
    c.slotIndex = null
    cleared.push(c)
  }
  return cleared
}

function shuffleBoard(cards, box) {
  const pile = []
  let maxLayer = 1
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    if (c.removed || c.slotIndex != null) continue
    pile.push(c)
    if (c.layer > maxLayer) maxLayer = c.layer
  }
  if (!pile.length) return
  const layers = Math.max(3, maxLayer + 1)
  const cardW = pile[0].w
  const cardH = pile[0].h
  layoutPile(pile, box, cardW, cardH, layers)
  ensureOpeningMatch(cards)
}

function spawnEndless(cards, box, cardW, cardH, difficulty) {
  const types = Math.min(6 + Math.floor(difficulty / 4), ITEMS.length)
  const topLayer = activeCards(cards).reduce(function (m, c) {
    return Math.max(m, c.layer)
  }, 0) + 1
  const n = 2 + (Math.random() < 0.35 ? 1 : 0)
  const spawned = []
  const baseType = randInt(0, types - 1)
  for (let i = 0; i < n; i++) {
    const type = i === 0 || Math.random() < 0.55 ? baseType : randInt(0, types - 1)
    const c = makeCard(type, topLayer)
    c.w = cardW
    c.h = cardH
    c.boardW = cardW
    c.boardH = cardH
    c.x = box.x + randInt(8, Math.max(9, box.w - cardW - 8))
    c.y = box.y + randInt(8, Math.max(9, box.h - cardH - 8))
    if (difficulty > 5 && Math.random() < 0.12) {
      c.locked = true
      c.lockHp = 2
    }
    cards.push(c)
    spawned.push(c)
  }
  while (activeCards(cards).length > 42) {
    let lowest = null
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i]
      if (c.removed || c.slotIndex != null) continue
      if (!lowest || c.layer < lowest.layer) lowest = c
    }
    if (!lowest) break
    lowest.removed = true
  }
  return spawned
}

function emptySlotIndex(slots) {
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i]) return i
  }
  return -1
}

function fitCardInSlot(card, rect) {
  card.w = Math.max(24, rect.w - 6)
  card.h = Math.max(28, rect.h - 8)
  card.x = rect.x + (rect.w - card.w) / 2
  card.y = rect.y + (rect.h - card.h) / 2
  card.scale = 1
  card.layer = 100 + (card.slotIndex || 0)
}

function moveToSlot(card, slots, index, slotRects) {
  const old = slots[index]
  if (old) return false
  slots[index] = card
  card.slotIndex = index
  card.layer = 100 + index
  fitCardInSlot(card, slotRects[index])
  return true
}

function clearSlotOf(card, slots) {
  if (card.slotIndex == null) return
  if (slots[card.slotIndex] === card) slots[card.slotIndex] = null
  card.slotIndex = null
}

function compactSlots(slots, slotRects) {
  const kept = []
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] && !slots[i].removed) kept.push(slots[i])
    slots[i] = null
  }
  for (let i = 0; i < kept.length; i++) {
    kept[i].slotIndex = i
    slots[i] = kept[i]
    fitCardInSlot(kept[i], slotRects[i])
  }
}

function findSlotPair(slots) {
  const filled = []
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] && !slots[i].removed) filled.push(slots[i])
  }
  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      if (canMatch(filled[i], filled[j])) return [filled[i], filled[j]]
    }
  }
  return null
}

function findStagingMatch(card, slots) {
  if (!card) return null
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]
    if (s && s.id !== card.id && canMatch(card, s)) return s
  }
  return null
}

function hasAnyPairOnBoard(cards) {
  const map = {}
  const list = activeCards(cards)
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    const k = typeKey(c)
    map[k] = (map[k] || 0) + 1
    if (map[k] >= 2) return true
  }
  return false
}

function ensureSomePair(cards) {
  if (hasAnyPairOnBoard(cards)) return
  const list = activeCards(cards)
  if (list.length >= 2) {
    list[0].type = list[1].type
    list[0].advanced = list[1].advanced
    list[0].locked = false
    list[1].locked = false
  }
}

function isFailed(cards, movesLeft, slots) {
  if (clickableSamePairs(cards).length > 0) return false
  if (findSlotPair(slots)) return false
  const freeExists = activeCards(cards).some(function (c) {
    return isFree(c, cards) && c.slotIndex == null
  })
  const slotEmpty = emptySlotIndex(slots) !== -1
  if (movesLeft > 0 && freeExists && slotEmpty) return false
  return true
}

module.exports = {
  typeKey: typeKey,
  activeCards: activeCards,
  isCovered: isCovered,
  isFree: isFree,
  isAdjacent: isAdjacent,
  createBoard: createBoard,
  findCardAt: findCardAt,
  clickableSamePairs: clickableSamePairs,
  canMatch: canMatch,
  applyLockDamage: applyLockDamage,
  findSynthesisGroups: findSynthesisGroups,
  synthesizeGroup: synthesizeGroup,
  explodeAround: explodeAround,
  shuffleBoard: shuffleBoard,
  spawnEndless: spawnEndless,
  emptySlotIndex: emptySlotIndex,
  moveToSlot: moveToSlot,
  fitCardInSlot: fitCardInSlot,
  compactSlots: compactSlots,
  findSlotPair: findSlotPair,
  findStagingMatch: findStagingMatch,
  clearSlotOf: clearSlotOf,
  ensureSomePair: ensureSomePair,
  isFailed: isFailed,
  makeCard: makeCard,
  getLevelConfig: getLevelConfig,
  getEndlessConfig: getEndlessConfig
}
