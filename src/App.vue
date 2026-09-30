<script setup>
import { computed, reactive, ref, watch } from 'vue'
import InstructionRow from './components/InstructionRow.vue'
import { importIc10 } from './lib/importer.js'
import { t, locale, LOCALES } from './lib/i18n.js'
import {
  createInstruction, generate, validate,
  IC10_MAX_LINES, IC10_MAX_LINE_LENGTH, SORTER_MEMORY_SIZE, MODES,
} from './lib/sorter.js'

const STORAGE_KEY = 'stationeers-sorter-config'
const REPO_URL = 'https://github.com/Ghardo/stationeers-sort-forge'

function defaultConfig() {
  return {
    device: 'd0',
    clear: true,
    setMode: true,
    mode: 1,
    regA: 'r0',
    regB: 'r1',
    style: 'ins',
    compact: false,
    comments: false,
    instructions: [],
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.instructions) return { ...defaultConfig(), ...saved }
  } catch { /* ignore broken storage */ }
  return defaultConfig()
}

const config = reactive(load())
watch(config, (c) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)) } catch { /* ignore */ }
}, { deep: true })

const devices = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'db']
const registers = Array.from({ length: 16 }, (_, i) => `r${i}`)

const lines = computed(() => generate(config))
const code = computed(() => lines.value.join('\n'))
const invalidCount = computed(() => config.instructions.filter((i) => validate(i).length).length)
const longLines = computed(() => lines.value.filter((l) => l.length > IC10_MAX_LINE_LENGTH).length)
const tooManyInstructions = computed(() => config.instructions.length > SORTER_MEMORY_SIZE)
const tooManyLines = computed(() => lines.value.length > IC10_MAX_LINES)

// --- list editing ---
function add(op) { config.instructions.push(createInstruction(op)) }
function remove(i) { config.instructions.splice(i, 1) }
function duplicate(i) { config.instructions.splice(i + 1, 0, { ...config.instructions[i], id: crypto.randomUUID() }) }
function move(i, dir) {
  const list = config.instructions
  ;[list[i], list[i + dir]] = [list[i + dir], list[i]]
}
function clearAll() {
  if (confirm(t('confirm.clearAll'))) config.instructions.splice(0)
}

// --- output ---
const copied = ref(false)
async function copy() {
  await navigator.clipboard.writeText(code.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

// --- IC10 import ---
const importOpen = ref(false)
const importText = ref('')
const importWarnings = ref([])

function openImport() {
  importText.value = ''
  importWarnings.value = []
  importOpen.value = true
}

function applyImport() {
  const res = importIc10(importText.value)
  importWarnings.value = res.warnings
  if (!res.instructions.length) {
    importWarnings.value = [t('import.none'), ...res.warnings]
    return
  }
  if (config.instructions.length && !confirm(t('confirm.replace'))) return
  config.instructions.splice(0, Infinity, ...res.instructions)
  if (res.device) config.device = res.device
  config.clear = res.clear
  config.setMode = res.mode !== null
  if (res.mode !== null) config.mode = res.mode
  if (!res.warnings.length) importOpen.value = false
}
</script>

<template>
  <header>
    <div class="title">
      <h1>SortForge <span>Logic Sorter IC10 Generator</span></h1>
      <a class="repo" :href="REPO_URL" target="_blank" rel="noopener" :title="t('app.source')" :aria-label="t('app.source')">
        <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      </a>
      <div class="lang" role="group" aria-label="Language">
        <button v-for="l in LOCALES" :key="l" :class="{ active: locale === l }" @click="locale = l">{{ l.toUpperCase() }}</button>
      </div>
    </div>
    <p class="muted">{{ t('app.subtitle') }}</p>
  </header>

  <main>
    <section class="editor">
      <div class="panel settings">
        <label>{{ t('settings.device') }}
          <select v-model="config.device"><option v-for="d in devices" :key="d">{{ d }}</option></select>
        </label>
        <label><input v-model="config.clear" type="checkbox" /> {{ t('settings.clear') }}</label>
        <label><input v-model="config.setMode" type="checkbox" /> {{ t('settings.setMode') }}
          <select v-model.number="config.mode" :disabled="!config.setMode">
            <option v-for="m in MODES" :key="m.value" :value="m.value">{{ m.value }} {{ t(`mode.${m.name}`) }}</option>
          </select>
        </label>
        <label :class="{ disabled: config.compact }">{{ t('settings.register') }}
          <select v-model="config.regA" :disabled="config.compact"><option v-for="r in registers" :key="r">{{ r }}</option></select>
          <select v-if="config.style === 'shift'" v-model="config.regB" :disabled="config.compact"><option v-for="r in registers" :key="r">{{ r }}</option></select>
        </label>
        <label :class="{ disabled: config.compact }">{{ t('settings.style') }}
          <select v-model="config.style" :disabled="config.compact">
            <option value="ins">{{ t('style.ins') }}</option>
            <option value="shift">{{ t('style.shift') }}</option>
          </select>
        </label>
        <label :title="t('settings.compactHint')">
          <input v-model="config.compact" type="checkbox" /> {{ t('settings.compact') }}
        </label>
        <label><input v-model="config.comments" type="checkbox" /> {{ t('settings.comments') }}</label>
      </div>

      <div class="toolbar">
        <button @click="add('FilterPrefabHashEquals')">{{ t('add.prefab') }}</button>
        <button @click="add('FilterSortingClassCompare')">{{ t('add.sortingClass') }}</button>
        <button @click="add('FilterSlotTypeCompare')">{{ t('add.slotType') }}</button>
        <button @click="add('FilterQuantityCompare')">{{ t('add.quantity') }}</button>
        <button @click="add('LimitNextExecutionByCount')">{{ t('add.limit') }}</button>
        <span class="spacer" />
        <button @click="openImport">{{ t('btn.import') }}</button>
        <button class="danger" @click="clearAll">{{ t('btn.clearAll') }}</button>
      </div>

      <TransitionGroup name="list" tag="div" class="list">
        <InstructionRow
          v-for="(ins, i) in config.instructions"
          :key="ins.id"
          v-model="config.instructions[i]"
          :index="i"
          :is-first="i === 0"
          :is-last="i === config.instructions.length - 1"
          @up="move(i, -1)"
          @down="move(i, 1)"
          @remove="remove(i)"
          @duplicate="duplicate(i)"
        />
      </TransitionGroup>
      <p v-if="!config.instructions.length" class="muted empty">{{ t('empty') }}</p>
    </section>

    <section class="output panel">
      <div class="out-head">
        <h2>IC10</h2>
        <span class="stat" :class="{ bad: tooManyLines }">{{ t('out.lines', { n: lines.length, max: IC10_MAX_LINES }) }}</span>
        <span class="stat" :class="{ bad: tooManyInstructions }">{{ t('out.slots', { n: config.instructions.length, max: SORTER_MEMORY_SIZE }) }}</span>
        <button class="primary" :disabled="invalidCount > 0" @click="copy">{{ copied ? t('btn.copied') : t('btn.copy') }}</button>
      </div>
      <ul class="warnings">
        <li v-if="invalidCount">{{ t('warn.invalid', { n: invalidCount }) }}</li>
        <li v-if="tooManyLines">{{ t('warn.tooManyLines') }}</li>
        <li v-if="longLines">{{ t('warn.longLines', { n: longLines, max: IC10_MAX_LINE_LENGTH }) }}</li>
        <li v-if="tooManyInstructions">{{ t('warn.tooManyInstructions', { n: config.instructions.length, max: SORTER_MEMORY_SIZE }) }}</li>
      </ul>
      <pre><code>{{ code }}</code></pre>
    </section>
  </main>

  <div v-if="importOpen" class="overlay" @click.self="importOpen = false">
    <div class="panel dialog">
      <h2>{{ t('import.title') }}</h2>
      <p class="muted">{{ t('import.hint') }}</p>
      <textarea v-model="importText" rows="16" spellcheck="false" placeholder="clr d0&#10;s d0 Mode 1&#10;..." />
      <ul v-if="importWarnings.length" class="warnings">
        <li v-for="w in importWarnings" :key="w">{{ w }}</li>
      </ul>
      <div class="dialog-actions">
        <button @click="importOpen = false">{{ importWarnings.length ? t('btn.close') : t('btn.cancel') }}</button>
        <button class="primary" :disabled="!importText.trim()" @click="applyImport">{{ t('btn.apply') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
header { padding: 1.25rem 1.5rem 0.5rem; }
h1 { margin: 0; font-size: 1.6rem; color: var(--accent); letter-spacing: 0.02em; }
h1 span { color: var(--text); font-weight: 400; }
header p { margin: 0.25rem 0 0; }
.title { display: flex; align-items: center; gap: 1rem; }
.repo { margin-left: auto; color: var(--muted); display: flex; }
.repo:hover { color: var(--accent); }
.lang { display: flex; }
.lang button { border-radius: 0; padding: 0.2rem 0.6rem; font-size: 0.8rem; }
.lang button:first-child { border-radius: 4px 0 0 4px; }
.lang button:last-child { border-radius: 0 4px 4px 0; border-left: 0; }
.lang button.active { background: var(--accent); color: #1a1a1a; border-color: var(--accent); font-weight: 600; }
main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30rem;
  gap: 1rem;
  padding: 1rem 1.5rem 2rem;
  align-items: start;
}
.editor { display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
.settings { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; align-items: center; }
.settings label { display: flex; gap: 0.4rem; align-items: center; }
.settings .disabled { opacity: 0.5; }
.small { width: 4rem; }
.toolbar { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
.spacer { flex: 1; }
.list { display: flex; flex-direction: column; gap: 0.4rem; }
.empty { text-align: center; padding: 2rem; }
.output { position: sticky; top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.out-head { display: flex; align-items: center; gap: 0.75rem; }
.out-head h2 { margin: 0; font-size: 1.1rem; flex: 1; }
.stat { font-family: var(--mono); font-size: 0.85rem; color: var(--muted); }
.stat.bad { color: var(--danger); }
.warnings { margin: 0; padding-left: 1.1rem; color: var(--danger); font-size: 0.85rem; }
.warnings:empty { display: none; }
.warnings .info { color: var(--warn); }
pre {
  margin: 0; padding: 0.75rem; background: var(--code-bg); border: 1px solid var(--border);
  border-radius: 6px; max-height: 70vh; overflow: auto; font-size: 0.85rem; line-height: 1.45;
}
.overlay {
  position: fixed; inset: 0; background: rgb(0 0 0 / 0.6);
  display: grid; place-items: center; padding: 1rem; z-index: 10;
}
.dialog { width: min(40rem, 100%); display: flex; flex-direction: column; gap: 0.6rem; }
.dialog h2 { margin: 0; font-size: 1.1rem; }
.dialog p { margin: 0; }
.dialog textarea {
  font: 0.85rem/1.45 var(--mono); color: var(--text); background: var(--code-bg);
  border: 1px solid var(--border); border-radius: 6px; padding: 0.6rem; resize: vertical;
}
.dialog-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
.list-move { transition: transform 0.2s; }
@media (max-width: 1100px) {
  main { grid-template-columns: 1fr; }
  .output { position: static; }
}
</style>
