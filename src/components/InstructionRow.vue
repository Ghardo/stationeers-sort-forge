<script setup>
import { computed } from 'vue'
import {
  INSTRUCTIONS, CONDITIONS, SORTING_CLASSES,
  instructionByOp, encode, validate, prefabHash,
} from '../lib/sorter.js'
import { t } from '../lib/i18n.js'

const props = defineProps({
  index: { type: Number, required: true },
  isFirst: Boolean,
  isLast: Boolean,
})
const ins = defineModel({ type: Object, required: true })
defineEmits(['up', 'down', 'remove', 'duplicate'])

const def = computed(() => instructionByOp[ins.value.op])
const errors = computed(() => validate(ins.value))
const word = computed(() => (errors.value.length ? null : encode(ins.value)))
const hash = computed(() => prefabHash(ins.value.prefab))
</script>

<template>
  <div class="row" :class="{ invalid: errors.length }">
    <span class="idx">{{ props.index }}</span>

    <select v-model="ins.op" class="op">
      <option v-for="i in INSTRUCTIONS" :key="i.op" :value="i.op">
        {{ t(`op.${i.op}`) }}
      </option>
    </select>

    <div class="fields">
      <template v-for="f in def.fields" :key="f.key">
        <select v-if="f.kind === 'condition'" v-model="ins.condition" class="cond">
          <option v-for="c in CONDITIONS" :key="c.name" :value="c.name">{{ c.label }} {{ c.name }}</option>
        </select>

        <select v-else-if="f.kind === 'sortingClass'" v-model="ins.sortingClass">
          <option v-for="c in SORTING_CLASSES" :key="c.name" :value="c.name">{{ c.name }}</option>
        </select>

        <input
          v-else-if="f.kind === 'slotClass'" v-model.trim="ins.slotClass" class="slot"
          :placeholder="t('row.slotPlaceholder')" spellcheck="false"
        />

        <span v-else-if="f.kind === 'prefab'" class="prefab">
          <input v-model.trim="ins.prefab" :placeholder="t('row.prefabPlaceholder')" spellcheck="false" />
          <small class="muted" title="HASH()">#{{ hash }}</small>
        </span>

        <input v-else v-model.number="ins[f.key]" type="number" :min="f.min" :max="f.max" class="num" />
      </template>
    </div>

    <code class="word" :title="word != null ? '0x' + BigInt.asUintN(64, word).toString(16) : ''">
      {{ errors.length ? errors.join(', ') : word ?? t('row.resolvedInGame') }}
    </code>

    <div class="actions">
      <button :disabled="isFirst" :title="t('row.up')" @click="$emit('up')">▲</button>
      <button :disabled="isLast" :title="t('row.down')" @click="$emit('down')">▼</button>
      <button :title="t('row.duplicate')" @click="$emit('duplicate')">⧉</button>
      <button class="danger" :title="t('row.remove')" @click="$emit('remove')">✕</button>
    </div>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 2rem 15rem 1fr 12rem auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--panel);
}
.row.invalid { border-color: var(--danger); }
.idx { color: var(--accent); font-family: var(--mono); text-align: right; }
.fields { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
.prefab { display: flex; gap: 0.4rem; align-items: center; flex: 1; }
.prefab input { flex: 1; min-width: 12rem; font-family: var(--mono); }
.cond { width: 8.5rem; }
.num { width: 7rem; }
.slot { width: 13rem; font-family: var(--mono); }
.word { font-size: 0.8rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.invalid .word { color: var(--danger); }
.actions { display: flex; gap: 0.25rem; }
.actions button { padding: 0.2rem 0.45rem; }
@media (max-width: 900px) {
  .row { grid-template-columns: 2rem 1fr; }
  .fields, .word, .actions { grid-column: 2; }
}
</style>
