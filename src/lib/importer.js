// Reads existing IC10 sorter code back into instructions.
// Runs a small integer interpreter over the code and decodes every `put`.

import {
  CONDITIONS, SORTING_CLASSES, SLOT_CLASSES, INSTRUCTIONS, MODES,
  createInstruction, hashString,
} from './sorter.js'
import { t } from './i18n.js'

const CONSTANTS = new Map([
  ...CONDITIONS.map((c) => [c.name, c.value]),
  ...SORTING_CLASSES.map((c) => [`SortingClass.${c.name}`, c.value]),
  ...SLOT_CLASSES.map((c) => [`SlotClass.${c.name}`, c.value]),
  ...INSTRUCTIONS.map((i) => [`SorterInstruction.${i.op}`, i.value]),
  ['SorterInstruction.None', 0],
  ...MODES.map((m) => [m.name, m.value]),
])

const DEVICE_RE = /^(d[0-5]|db)$/

export function importIc10(source) {
  const regs = new Map()
  const defines = new Map()
  const aliases = new Map()
  const hashNames = new Map()
  const slots = new Map()
  const warnings = []
  const result = { device: null, clear: false, mode: null }

  const regName = (tok) => {
    const t = aliases.get(tok) ?? tok
    return /^r(1[0-5]|[0-9])$/.test(t) ? t : null
  }
  const devName = (tok) => {
    const t = aliases.get(tok) ?? tok
    return DEVICE_RE.test(t) ? t : null
  }

  function value(tok) {
    const hash = /^HASH\("([^"]*)"\)$/.exec(tok)
    if (hash) {
      const h = hashString(hash[1])
      hashNames.set(h, hash[1])
      return BigInt(h)
    }
    const r = regName(tok)
    if (r) return regs.get(r) ?? 0n
    if (defines.has(tok)) return defines.get(tok)
    if (CONSTANTS.has(tok)) return BigInt(CONSTANTS.get(tok))
    if (/^-?\d+$/.test(tok)) return BigInt(tok)
    if (/^\$[0-9a-fA-F]+$/.test(tok)) return BigInt('0x' + tok.slice(1))
    if (/^%[01]+$/.test(tok)) return BigInt('0b' + tok.slice(1))
    throw new Error(t('imp.unknownValue', { v: tok }))
  }

  const i64 = (v) => BigInt.asIntN(64, v)
  const ops = {
    move: (a) => value(a),
    add: (a, b) => value(a) + value(b),
    sub: (a, b) => value(a) - value(b),
    or: (a, b) => value(a) | value(b),
    and: (a, b) => value(a) & value(b),
    xor: (a, b) => value(a) ^ value(b),
    sll: (a, b) => value(a) << value(b),
    sla: (a, b) => value(a) << value(b),
  }

  source.split(/\r?\n/).forEach((raw, n) => {
    const [code, comment = ''] = raw.split('#', 2)
    // names in comments let us map precomputed hashes back to prefab names
    for (const word of comment.match(/[A-Za-z_]\w*/g) ?? []) hashNames.set(hashString(word), word)
    const line = code.trim()
    if (!line) return
    // tokens, keeping HASH("...") together
    const tok = line.match(/HASH\("[^"]*"\)|\S+/g)
    const [cmd, ...args] = tok
    const where = t('imp.line', { n: n + 1 })
    try {
      if (cmd === 'define') defines.set(args[0], value(args[1]))
      else if (cmd === 'alias') aliases.set(args[0], args[1])
      else if (cmd in ops) {
        const r = regName(args[0])
        if (!r) throw new Error(t('imp.registerExpected', { v: args[0] }))
        regs.set(r, i64(ops[cmd](...args.slice(1))))
      } else if (cmd === 'ins') {
        const r = regName(args[0])
        const [a, start, len] = args.slice(1).map(value)
        const mask = ((1n << len) - 1n) << start
        regs.set(r, i64(((regs.get(r) ?? 0n) & ~mask) | ((a << start) & mask)))
      } else if (cmd === 'clr') {
        result.device ??= devName(args[0])
        result.clear = true
      } else if (cmd === 's' && args[1] === 'Mode') {
        result.device ??= devName(args[0])
        result.mode = Number(value(args[2]))
      } else if (cmd === 'put') {
        result.device ??= devName(args[0])
        slots.set(Number(value(args[1])), value(args[2]))
      } else {
        warnings.push(`${where}: ${t('imp.ignored', { v: cmd })}`)
      }
    } catch (e) {
      warnings.push(`${where}: ${e.message}`)
    }
  })

  const instructions = [...slots.entries()]
    .sort(([a], [b]) => a - b)
    .map(([idx, word]) => decode(word, hashNames, (msg) => warnings.push(`Slot ${idx}: ${msg}`)))
    .filter(Boolean)

  return { ...result, instructions, warnings }
}

function decode(word, hashNames, warn) {
  const opcode = Number(word & 0xffn)
  const def = INSTRUCTIONS.find((i) => i.value === opcode)
  if (!def) {
    warn(t('imp.unknownOpcode', { v: opcode }))
    return null
  }
  const ins = createInstruction(def.op)
  for (const f of def.fields) {
    const raw = BigInt.asUintN(f.width, word >> BigInt(f.shift))
    switch (f.kind) {
      case 'prefab': {
        const h = Number(BigInt.asIntN(32, raw))
        ins.prefab = hashNames.get(h) ?? String(h)
        break
      }
      case 'condition': {
        const c = CONDITIONS.find((c) => c.value === Number(raw))
        if (!c) warn(t('imp.unknownCondition', { v: raw }))
        ins.condition = c?.name ?? 'Equals'
        break
      }
      case 'sortingClass': {
        const c = SORTING_CLASSES.find((c) => c.value === Number(raw))
        if (!c) warn(t('imp.unknownSortingClass', { v: raw }))
        ins.sortingClass = c?.name ?? 'Default'
        break
      }
      case 'slotClass': {
        const c = SLOT_CLASSES.find((c) => c.value === Number(raw))
        ins.slotClass = c ? `SlotClass.${c.name}` : String(raw)
        break
      }
      default:
        ins[f.key] = Number(raw)
    }
  }
  return ins
}
