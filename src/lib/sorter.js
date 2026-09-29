// Logic Sorter instruction model, encoding and IC10 code generation.
//
// Source: https://stationeers-wiki.com/Logic_Sorter
// Memory: 32 x 64-bit words. Each word: opcode in bits 0-7, payload fields
// (shift/width, bit 0 = LSB) as listed in INSTRUCTIONS[].fields.

import { t } from './i18n.js'

export const IC10_MAX_LINES = 128
export const IC10_MAX_LINE_LENGTH = 90
export const SORTER_MEMORY_SIZE = 32

export const MODES = [
  { value: 0, name: 'All' },
  { value: 1, name: 'Any' },
  { value: 2, name: 'None' },
]

// Stationeers HASH() == signed CRC32 of the prefab name
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function hashString(str) {
  let crc = 0xffffffff
  for (const byte of new TextEncoder().encode(str)) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) | 0
}

export const CONDITIONS = [
  { name: 'Equals', value: 0, label: '=' },
  { name: 'Greater', value: 1, label: '>' },
  { name: 'Less', value: 2, label: '<' },
  { name: 'NotEquals', value: 3, label: '≠' },
]

export const SORTING_CLASSES = [
  'Default', 'Kits', 'Tools', 'Resources', 'Food', 'Clothing',
  'Appliances', 'Atmospherics', 'Storage', 'Ores', 'Ices',
].map((name, value) => ({ name, value }))

export const SLOT_CLASSES = [
  'None', 'Helmet', 'Suit', 'Back', 'GasFilter', 'GasCanister', 'Motherboard',
  'Circuitboard', 'DataDisk', 'Organ', 'Ore', 'Plant', 'Uniform', 'Entity',
  'Battery', 'Egg', 'Belt', 'Tool', 'Appliance', 'Ingot', 'Torpedo',
  'Cartridge', 'AccessCard', 'Magazine', 'Circuit', 'Bottle',
  'ProgrammableChip', 'Glasses', 'CreditCard', 'DirtCanister',
  'SensorProcessingUnit', 'LiquidCanister', 'LiquidBottle', 'Wreckage',
  'SoundCartridge', 'DrillHead', 'ScanningHead', 'Flare', 'Blocked', 'SuitMod',
  'Crate', 'Portables', 'RocketPayload', 'AutoInjector',
].map((name, value) => ({ name, value }))

// Field kinds: 'prefab' (string -> HASH), 'condition', 'sortingClass', 'slotClass' (free text), 'number'
export const INSTRUCTIONS = [
  {
    op: 'FilterPrefabHashEquals', value: 1,
    fields: [{ key: 'prefab', kind: 'prefab', shift: 8, width: 32 }],
  },
  {
    op: 'FilterPrefabHashNotEquals', value: 2,
    fields: [{ key: 'prefab', kind: 'prefab', shift: 8, width: 32 }],
  },
  {
    op: 'FilterSortingClassCompare', value: 3,
    fields: [
      { key: 'condition', kind: 'condition', shift: 8, width: 8 },
      { key: 'sortingClass', kind: 'sortingClass', shift: 16, width: 16 },
    ],
  },
  {
    op: 'FilterSlotTypeCompare', value: 4,
    fields: [
      { key: 'condition', kind: 'condition', shift: 8, width: 8 },
      { key: 'slotClass', kind: 'slotClass', shift: 16, width: 16 },
    ],
  },
  {
    op: 'FilterQuantityCompare', value: 5,
    fields: [
      { key: 'condition', kind: 'condition', shift: 8, width: 8 },
      { key: 'quantity', kind: 'number', shift: 16, width: 16, min: 0, max: 0xffff },
    ],
  },
  {
    op: 'LimitNextExecutionByCount', value: 6,
    fields: [{ key: 'count', kind: 'number', shift: 8, width: 32, min: 0, max: 0x7fffffff }],
  },
]

export const instructionByOp = Object.fromEntries(INSTRUCTIONS.map((i) => [i.op, i]))

export function createInstruction(op = 'FilterPrefabHashEquals') {
  return {
    id: crypto.randomUUID(),
    op,
    prefab: '',
    condition: 'Equals',
    sortingClass: 'Default',
    slotClass: 'SlotClass.None',
    quantity: 1,
    count: 1,
  }
}

const isNumeric = (v) => /^-?\d+$/.test(String(v ?? '').trim())

// Prefab field: a prefab name or an already computed hash
export function prefabHash(v) {
  return isNumeric(v) ? Number(String(v).trim()) | 0 : hashString(v ?? '')
}

// Free-text slot type: a number or a known name (with or without "SlotClass." prefix).
// Returns null if unknown - the game then has to resolve it.
function resolveSlotClass(v) {
  const text = String(v ?? '').trim()
  if (/^-?\d+$/.test(text)) return Number(text)
  const name = text.replace(/^Slot(Class|Type)\./, '')
  return SLOT_CLASSES.find((c) => c.name === name)?.value ?? null
}

// Numeric value of a field as the game would resolve it
function fieldValue(field, ins) {
  const v = ins[field.key]
  switch (field.kind) {
    case 'prefab': return prefabHash(v)
    case 'condition': return CONDITIONS.find((c) => c.name === v)?.value ?? 0
    case 'sortingClass': return SORTING_CLASSES.find((c) => c.name === v)?.value ?? 0
    case 'slotClass': return resolveSlotClass(v)
    default: return Math.trunc(Number(v) || 0)
  }
}

// IC10 expression for a field (let the game resolve constants where possible)
function fieldSymbol(field, ins) {
  const v = ins[field.key]
  switch (field.kind) {
    case 'prefab': return isNumeric(v) ? String(v).trim() : `HASH("${v}")`
    case 'condition': return v
    case 'sortingClass': return `SortingClass.${v}`
    case 'slotClass': return String(v).trim()
    default: return String(Math.trunc(Number(v) || 0))
  }
}

// Instruction word, identical to what the generated `ins` code computes
export function encode(ins) {
  const def = instructionByOp[ins.op]
  let word = BigInt(def.value)
  for (const f of def.fields) {
    const v = fieldValue(f, ins)
    if (v === null) return null
    word |= BigInt.asUintN(f.width, BigInt(v)) << BigInt(f.shift)
  }
  return word
}

export function validate(ins) {
  const def = instructionByOp[ins.op]
  const errors = []
  for (const f of def.fields) {
    const v = ins[f.key]
    if (f.kind === 'prefab') {
      if (!v || !v.trim()) errors.push(t('val.prefabMissing'))
      else if (/["\s]/.test(v)) errors.push(t('val.prefabChars'))
    }
    if (f.kind === 'slotClass') {
      if (!v || !String(v).trim()) errors.push(t('val.slotMissing'))
      else if (/\s/.test(String(v).trim())) errors.push(t('val.slotSpaces'))
    }
    if (f.kind === 'number') {
      const n = Number(v)
      if (!Number.isInteger(n) || n < f.min || n > f.max) errors.push(t('val.range', { min: f.min, max: f.max }))
    }
  }
  return errors
}

export function generate(config) {
  const { device, clear, setMode, mode, regA, regB, style, compact, comments } = config
  const lines = []
  const push = (l) => lines.push(l)

  if (clear) push(`clr ${device}`)
  if (setMode) push(`s ${device} Mode ${mode}`)

  config.instructions.forEach((ins, idx) => {
    const def = instructionByOp[ins.op]
    if (comments) push(`# ${idx}: ${describe(ins)}`)

    const word = compact ? encode(ins) : null
    if (word !== null) {
      // keep the prefab name readable (and re-importable) next to the bare number
      const name = def.fields.some((f) => f.kind === 'prefab') && !isNumeric(ins.prefab) ? ` # ${ins.prefab}` : ''
      push(`put ${device} ${idx} ${word}${name}`)
      return
    }

    if (style === 'shift') {
      // sll/or: fields are not masked, a negative HASH also sets bits above 39 (ignored by the sorter)
      const [first, ...rest] = def.fields
      push(`sll ${regA} ${fieldSymbol(first, ins)} ${first.shift}`)
      for (const f of rest) {
        push(`sll ${regB} ${fieldSymbol(f, ins)} ${f.shift}`)
        push(`or ${regA} ${regA} ${regB}`)
      }
      push(`or ${regA} ${regA} SorterInstruction.${def.op}`)
    } else {
      push(`move ${regA} SorterInstruction.${def.op}`)
      for (const f of def.fields) push(`ins ${regA} ${fieldSymbol(f, ins)} ${f.shift} ${f.width}`)
    }
    push(`put ${device} ${idx} ${regA}`)
  })

  return lines
}

export function describe(ins) {
  const def = instructionByOp[ins.op]
  const cond = CONDITIONS.find((c) => c.name === ins.condition)?.label ?? '='
  switch (def.op) {
    case 'FilterPrefabHashEquals': return `Prefab = ${ins.prefab}`
    case 'FilterPrefabHashNotEquals': return `Prefab ≠ ${ins.prefab}`
    case 'FilterSortingClassCompare': return `SortingClass ${cond} ${ins.sortingClass}`
    case 'FilterSlotTypeCompare': return `SlotType ${cond} ${ins.slotClass}`
    case 'FilterQuantityCompare': return `Quantity ${cond} ${ins.quantity}`
    case 'LimitNextExecutionByCount': return `Limit next by ${ins.count}`
    default: return def.op
  }
}
