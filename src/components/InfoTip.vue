<script setup>
import { nextTick, ref } from 'vue'

// Small ⓘ icon with a tooltip (hover, keyboard focus or tap). The bubble is
// teleported and positioned fixed, clamped to the viewport.
defineProps({ text: { type: String, required: true } })

const open = ref(false)
const btn = ref(null)
const tip = ref(null)
const pos = ref({})
const id = `tip-${crypto.randomUUID()}`

async function show() {
  open.value = true
  await nextTick()
  const r = btn.value.getBoundingClientRect()
  const w = tip.value.offsetWidth
  const h = tip.value.offsetHeight
  const margin = 8
  const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, margin), window.innerWidth - w - margin)
  const above = r.top - h - 6
  const top = above >= margin ? above : r.bottom + 6
  pos.value = { left: `${left}px`, top: `${top}px` }
}

function hide() { open.value = false }
</script>

<template>
  <button
    ref="btn" type="button" class="info" :aria-describedby="open ? id : undefined" aria-label="Info"
    @mouseenter="show" @mouseleave="hide" @focus="show" @blur="hide"
    @click.prevent="open ? hide() : show()" @keydown.esc="hide"
  >i</button>
  <Teleport to="body">
    <div v-if="open" :id="id" ref="tip" role="tooltip" class="info-tip" :style="pos">{{ text }}</div>
  </Teleport>
</template>

<style scoped>
.info {
  display: inline-grid; place-items: center;
  width: 1rem; height: 1rem; padding: 0; flex: none;
  border-radius: 50%; border: 1px solid var(--muted); background: transparent;
  color: var(--muted); font: italic 700 0.7rem/1 Georgia, serif; cursor: help;
}
.info:hover, .info:focus-visible { color: var(--accent); border-color: var(--accent); outline: none; }
</style>

<style>
.info-tip {
  position: fixed; z-index: 100; max-width: min(20rem, calc(100vw - 16px));
  padding: 0.5rem 0.65rem; border: 1px solid var(--border); border-radius: 6px;
  background: #252a33; color: var(--text); font-size: 0.82rem; line-height: 1.4;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.5); pointer-events: none; white-space: pre-line;
}
</style>
