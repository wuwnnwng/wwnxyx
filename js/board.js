const { CONFIG, ITEMS, layerCells, getLevelConfig, getEndlessConfig } = require('./config')
const { shuffle, randInt, rectsOverlapArea, inflate, dist, now, clamp } = require('./utils')

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
  const ix = card.w * 0.22
  const iy = card.h * 0.22
  const inner = {
    x: card.x + ix,
    y: card.y + iy,
    w: Math.max(10, card.w - ix * 2),
    h: Math.max(10, card.h - iy * 2)
  }
  for (let i = 0; i < cards.length; i++) {
    const o = cards[i]
    if (o.removed || o.id === card.id) continue
    if (o.slotIndex != null) continue
    if (o.layer <= card.layer) continue
    if (rectsOverlapArea(inner, o) > 8) return true
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

function stackSpec(cfg, cardCount) {
  let cols = Math.max(2, cfg.cols || 4)
  let rows = Math.max(1, cfg.rows || 2)
  let layers = Math.max(1, cfg.layers || 2)
  if (cardCount == null) return { cols: cols, rows: rows, layers: layers }
  let guard = 0
  while (guard++ < 20 && countStackSlots(cols, rows, layers) > cardCount + 1) {
    if (layers > 1) layers -= 1
    else if (rows > 2) rows -= 1
    else if (cols > 3) cols -= 1
    else break
  }
  while (guard++ < 40 && countStackSlots(cols, rows, layers) < cardCount) {
    if (rows < Math.max(6, cfg.rows || 4)) rows += 1
    else if (cols < Math.max(6, cfg.cols || 4)) cols += 1
    else if (layers < 5) layers += 1
    else break
  }
  return { cols: cols, rows: rows, layers: layers }
}

function countStackSlots(cols, rows, layers) {
  let n = 0
  for (let L = 0; L < layers; L++) {
    const g = layerCells(cols, rows, L)
    n += g.cols * g.rows
  }
  return n
}

function computeCardSize(plan, box, maxW, maxH) {
  const pad = 10
  const availW = Math.max(80, box.w - pad * 2)
  const availH = Math.max(90, box.h - pad * 2)
  const ox = 0.54
  const oy = 0.46
  const extra = plan.layers > 1 ? 0.5 : 0
  let cardW = Math.floor(availW / ((plan.cols - 1 + extra) * ox + 1.08))
  let cardH = Math.round(cardW * 1.2)
  const visH = ((plan.rows - 1 + extra) * oy + 1.08) * cardH
  if (visH > availH) {
    cardH = Math.floor(availH / ((plan.rows - 1 + extra) * oy + 1.08))
    cardW = Math.round(cardH / 1.2)
  }
  cardW = clamp(cardW, 34, maxW || 70)
  cardH = clamp(cardH, 42, maxH || 84)
  return { cardW: cardW, cardH: cardH, stepX: cardW * ox, stepY: cardH * oy }
}

function buildStackSlots(plan, box, size) {
  const cardW = size.cardW
  const cardH = size.cardH
  const stepX = size.stepX
  const stepY = size.stepY
  const slots = []
  const baseW = (plan.cols - 1) * stepX
  const baseH = (plan.rows - 1) * stepY

  for (let L = 0; L < plan.layers; L++) {
    const g = layerCells(plan.cols, plan.rows, L)
    const layerW = (g.cols - 1) * stepX
    const layerH = (g.rows - 1) * stepY
    const ox = (baseW - layerW) / 2 + (g.brick ? stepX * 0.5 : 0) + L * 4
    const oy = (baseH - layerH) / 2 + (g.brick ? stepY * 0.5 : 0) + L * 4
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        slots.push({
          layer: L,
          x: ox + c * stepX,
          y: oy + r * stepY,
          w: cardW,
          h: cardH
        })
      }
    }
  }

  if (slots.length % 2 === 1) slots.pop()
  if (!slots.length) return slots

  let minX = slots[0].x
  let minY = slots[0].y
  let maxX = slots[0].x + cardW
  let maxY = slots[0].y + cardH
  for (let i = 1; i < slots.length; i++) {
    const s = slots[i]
    if (s.x < minX) minX = s.x
    if (s.y < minY) minY = s.y
    if (s.x + cardW > maxX) maxX = s.x + cardW
    if (s.y + cardH > maxY) maxY = s.y + cardH
  }
  const dx = box.x + (box.w - (maxX - minX)) / 2 - minX
  const dy = box.y + (box.h - (maxY - minY)) / 2 - minY
  for (let i = 0; i < slots.length; i++) {
    slots[i].x = clamp(slots[i].x + dx, box.x, box.x + box.w - cardW)
    slots[i].y = clamp(slots[i].y + dy, box.y, box.y + box.h - cardH)
  }
  return slots
}

function layoutStack(cards, box, cfg, maxW, maxH) {
  const plan = stackSpec(cfg, cards.length)
  const size = computeCardSize(plan, box, maxW, maxH)
  let slots = buildStackSlots(plan, box, size)
  if (slots.length > cards.length) {
    while (slots.length > cards.length) slots.pop()
  }
  const packed = shuffle(cards.slice())
  if (slots.length < packed.length) {
    const extraLayer = plan.layers
    for (let i = slots.length; i < packed.length; i++) {
      const col = i - slots.length
      slots.push({
        layer: extraLayer,
        x: box.x + 8 + (col % plan.cols) * size.stepX,
        y: box.y + 8 + Math.floor(col / plan.cols) * size.stepY,
        w: size.cardW,
        h: size.cardH
      })
    }
  }
  while (slots.length > packed.length) slots.pop()
  for (let i = 0; i < packed.length; i++) {
    const c = packed[i]
    const s = slots[i]
    c.layer = s.layer
    c.x = s.x
    c.y = s.y
    c.w = size.cardW
    c.h = size.cardH
    c.boardW = size.cardW
    c.boardH = size.cardH
  }
  return size
}

function buildDeck(count, typeCount, advancedPairs) {
  const even = count - (count % 2)
  const pairN = Math.max(2, even / 2)
  const adv = Math.max(0, Math.min(advancedPairs || 0, Math.max(0, pairN - 3)))
  const normalPairs = pairN - adv
  const types = Math.max(2, Math.min(typeCount || 4, ITEMS.length, normalPairs))
  const cards = []
  for (let p = 0; p < normalPairs; p++) {
    const t = p % types
    cards.push(makeCard(t, 0))
    cards.push(makeCard(t, 0))
  }
  for (let i = 0; i < adv; i++) {
    const t = i % types
    cards.push(makeCard(t, 0, { advanced: true }))
    cards.push(makeCard(t, 0, { advanced: true }))
  }
  return cards
}

function assignLocks(cards, lockCount) {
  let maxLayer = 0
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].layer > maxLayer) maxLayer = cards[i].layer
  }
  const candidates = shuffle(cards.filter(function (c) {
    return !c.advanced && c.layer < maxLayer
  }))
  const add = Math.min(lockCount || 0, candidates.length)
  for (let i = 0; i < add; i++) {
    candidates[i].locked = true
    candidates[i].lockHp = 2
  }
}

function balanceOpening(cards, maxFree) {
  const limit = maxFree == null ? 1 : maxFree
  let guard = 0
  while (guard++ < 48) {
    const free = []
    const covered = []
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i]
      if (c.removed || c.slotIndex != null) continue
      if (isFree(c, cards)) free.push(c)
      else covered.push(c)
    }
    const groups = {}
    for (let i = 0; i < free.length; i++) {
      const t = typeKey(free[i])
      if (!groups[t]) groups[t] = []
      groups[t].push(free[i])
    }
    let overflow = null
    for (const t in groups) {
      if (groups[t].length > limit) {
        overflow = groups[t][groups[t].length - 1]
        break
      }
    }
    if (!overflow || !covered.length) break
    const freeCount = {}
    for (let i = 0; i < free.length; i++) {
      const k = typeKey(free[i])
      freeCount[k] = (freeCount[k] || 0) + 1
    }
    const other = covered.filter(function (c) {
      const k = typeKey(c)
      if (k === typeKey(overflow)) return false
      return (freeCount[k] || 0) < limit
    })
    if (!other.length) break
    const swap = other[0]
    const tx = overflow.x
    const ty = overflow.y
    const tl = overflow.layer
    overflow.x = swap.x
    overflow.y = swap.y
    overflow.layer = swap.layer
    swap.x = tx
    swap.y = ty
    swap.layer = tl
  }
}

function createBoard(cfg, box, cardW, cardH) {
  uid = 1
  const plan = stackSpec(cfg)
  let slotCount = countStackSlots(plan.cols, plan.rows, plan.layers)
  if (slotCount % 2) slotCount -= 1
  const cards = buildDeck(slotCount, cfg.types, cfg.advancedPairs || 0)
  layoutStack(cards, box, cfg, 92, 112)
  assignLocks(cards, cfg.locks)
  balanceOpening(cards, cfg.openCopies)
  ensureOpeningMatch(cards)
  return cards
}

function findCardAt(cards, x, y) {
  const list = activeCards(cards).slice().sort(function (a, b) {
    const sa = a.slotIndex != null ? 1000 : 0
    const sb = b.slotIndex != null ? 1000 : 0
    return (b.layer + sb) - (a.layer + sa)
  })
  let blocked = null
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (x < c.x || y < c.y || x > c.x + c.w || y > c.y + c.h) continue
    if (c.slotIndex != null) return c
    if (!isCovered(c, cards)) return c
    if (!blocked) blocked = c
  }
  return blocked
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
    if (c.slotIndex == null && !isFree(c, cards)) continue
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

function swapPose(a, b) {
  const tx = a.x
  const ty = a.y
  const tl = a.layer
  const tw = a.w
  const th = a.h
  a.x = b.x
  a.y = b.y
  a.layer = b.layer
  a.w = b.w
  a.h = b.h
  a.boardW = a.w
  a.boardH = a.h
  b.x = tx
  b.y = ty
  b.layer = tl
  b.w = tw
  b.h = th
  b.boardW = b.w
  b.boardH = b.h
}

function ensureOpeningMatch(cards) {
  if (clickableSamePairs(cards).length) return
  const boardCards = []
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    if (c.removed || c.slotIndex != null) continue
    boardCards.push(c)
  }
  if (boardCards.length < 2) return
  const free = boardCards.filter(function (c) { return isFree(c, cards) })
  for (let i = 0; i < free.length; i++) {
    const a = free[i]
    const key = typeKey(a)
    let partner = null
    for (let j = 0; j < boardCards.length; j++) {
      const c = boardCards[j]
      if (c.id === a.id || typeKey(c) !== key) continue
      if (isFree(c, cards)) continue
      partner = c
      break
    }
    if (!partner) continue
    let other = null
    for (let j = 0; j < free.length; j++) {
      if (free[j].id !== a.id && typeKey(free[j]) !== key) {
        other = free[j]
        break
      }
    }
    partner.locked = false
    partner.lockHp = 0
    if (other) swapPose(partner, other)
    else {
      partner.x = a.x
      partner.y = a.y
      partner.layer = a.layer
      partner.w = a.w
      partner.h = a.h
      partner.boardW = a.w
      partner.boardH = a.h
    }
    return
  }
  const uncovered = boardCards.filter(function (c) {
    return !c.locked && !isCovered(c, cards)
  })
  const pool = (uncovered.length >= 2 ? uncovered : boardCards).slice().sort(function (a, b) {
    return b.layer - a.layer
  })
  const a = pool[0]
  const b = pool[1]
  if (!a || !b) return
  a.locked = false
  b.locked = false
  b.advanced = a.advanced
  b.type = a.type
}

function shuffleBoard(cards, box, cfg) {
  const pile = []
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    if (c.removed || c.slotIndex != null) continue
    pile.push(c)
  }
  if (!pile.length) return
  const spec = cfg || { cols: 5, rows: 4, layers: 2 }
  layoutStack(pile, box, spec, 92, 112)
  balanceOpening(cards, spec.openCopies)
  ensureOpeningMatch(cards)
}

function spawnEndless(cards, box, cardW, cardH, difficulty) {
  const typeMax = Math.min(8 + Math.floor(difficulty / 2), ITEMS.length)
  const pairN = Math.min(5, 3 + Math.floor(difficulty / 2))
  let topLayer = 0
  let sample = null
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    if (c.removed || c.slotIndex != null) continue
    if (!sample) sample = c
    if (c.layer > topLayer) topLayer = c.layer
  }
  const lower = []
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    if (c.removed || c.slotIndex != null) continue
    if (c.layer < topLayer) lower.push(c)
  }
  const w = (sample && sample.w) || cardW
  const h = (sample && sample.h) || cardH
  const layer = topLayer + 1
  const gridCols = Math.min(4, pairN)
  const gridRows = Math.ceil(pairN / gridCols)
  const stepX = w * 0.54
  const stepY = h * 0.46
  const gridW = (gridCols - 1) * stepX + w
  const gridH = (gridRows - 1) * stepY + h
  const ox = box.x + (box.w - gridW) / 2
  const oy = box.y + Math.max(8, (box.h - gridH) / 2 - 12)
  const shift = randInt(0, Math.max(0, typeMax - 1))
  const spawned = []
  for (let i = 0; i < pairN; i++) {
    const type = (shift + i) % typeMax
    const top = makeCard(type, layer)
    top.w = w
    top.h = h
    top.boardW = w
    top.boardH = h
    const col = i % gridCols
    const row = Math.floor(i / gridCols)
    top.x = ox + col * stepX
    top.y = oy + row * stepY
    const mate = makeCard(type, layer)
    mate.w = w
    mate.h = h
    mate.boardW = w
    mate.boardH = h
    if (lower.length) {
      const anchor = lower[(i * 3) % lower.length]
      mate.x = anchor.x
      mate.y = anchor.y
      mate.layer = anchor.layer
      mate.w = anchor.w
      mate.h = anchor.h
      mate.boardW = anchor.w
      mate.boardH = anchor.h
      if (difficulty >= 3 && Math.random() < 0.28) {
        mate.locked = true
        mate.lockHp = 2
      }
    } else {
      mate.x = top.x + 8
      mate.y = top.y + 8
      mate.layer = layer
    }
    cards.push(top)
    cards.push(mate)
    spawned.push(top, mate)
  }
  while (activeCards(cards).length > 96) {
    const alive = activeCards(cards)
    const counts = {}
    for (let i = 0; i < alive.length; i++) {
      const k = typeKey(alive[i])
      counts[k] = (counts[k] || 0) + 1
    }
    let victim = null
    for (let i = 0; i < alive.length; i++) {
      const c = alive[i]
      if (c.slotIndex != null) continue
      if (counts[typeKey(c)] < 3) continue
      if (!victim || c.layer < victim.layer) victim = c
    }
    if (!victim) {
      for (let i = 0; i < alive.length; i++) {
        const c = alive[i]
        if (c.slotIndex != null) continue
        if (!victim || c.layer < victim.layer) victim = c
      }
    }
    if (!victim) break
    victim.removed = true
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

function isFailed(cards, slots) {
  if (emptySlotIndex(slots) !== -1) return false
  if (clickableSamePairs(cards).length > 0) return false
  if (findSlotPair(slots)) return false
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
