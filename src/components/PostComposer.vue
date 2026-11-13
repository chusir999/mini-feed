<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { COUNTER_WARNING_THRESHOLD, MAX_LENGTH } from '@/lib/constants'
import type { StatusMessage } from '@/types'

const props = defineProps<{
  status?: StatusMessage | null
  busy?: boolean
}>()

const emit = defineEmits<{
  submit: [text: string]
}>()

const draft = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)

const trimmedLength = computed(() => draft.value.trim().length)
const isDisabled = computed(() => trimmedLength.value === 0 || props.busy === true)
const counterText = computed(() => `${draft.value.length}/${MAX_LENGTH}`)

const counterState = computed(() => {
  if (draft.value.length >= MAX_LENGTH) return 'is-over'
  if (draft.value.length >= COUNTER_WARNING_THRESHOLD) return 'is-warning'
  return ''
})

const statusClass = computed(() => (props.status ? `is-${props.status.type}` : ''))

function resize(): void {
  const element = textarea.value
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 260)}px`
}

function submit(): void {
  if (isDisabled.value) return
  emit('submit', draft.value.trim())
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    submit()
  }
}

/** 由父组件在发布成功后调用，清空草稿并回焦 */
function reset(): void {
  draft.value = ''
  resize()
  void nextTick(() => textarea.value?.focus())
}

defineExpose({ reset })
</script>

<template>
  <section class="composer card" aria-labelledby="composer-heading">
    <h2 id="composer-heading" class="sr-only">发布新内容</h2>
    <form class="composer-form" @submit.prevent="submit">
      <div class="composer-avatar" aria-hidden="true">我</div>
      <div class="composer-body">
        <label class="sr-only" for="post-input">写下此刻的想法</label>
        <textarea
          id="post-input"
          ref="textarea"
          v-model="draft"
          class="composer-input"
          name="content"
          rows="3"
          :maxlength="MAX_LENGTH"
          placeholder="此刻在想些什么？"
          autocomplete="off"
          @input="resize"
          @keydown="handleKeydown"
        ></textarea>
        <div class="composer-footer">
          <div class="composer-meta">
            <span class="counter" :class="counterState">{{ counterText }}</span>
            <span class="hint">Ctrl / ⌘ + Enter 快速发布</span>
          </div>
          <button class="btn-primary" type="submit" :disabled="isDisabled">发布</button>
        </div>
      </div>
    </form>
    <p class="status" :class="statusClass" role="status" aria-live="polite">
      {{ props.status?.message ?? '' }}
    </p>
  </section>
</template>

<style scoped>
.composer {
  position: relative;
  padding: 18px 18px 14px;
  margin-bottom: 26px;
  transition: box-shadow 0.25s var(--ease), transform 0.25s var(--ease);
}

.composer:focus-within {
  transform: translateY(-2px);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1), var(--shadow-hover);
  border-color: #c7d2fe;
}

.composer-form {
  display: flex;
  gap: 12px;
}

.composer-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-primary-soft), var(--c-accent));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  user-select: none;
}

.composer-body {
  flex: 1;
  min-width: 0;
}

.composer-input {
  display: block;
  width: 100%;
  min-height: 76px;
  max-height: 260px;
  padding: 8px 2px;
  border: 0;
  outline: none;
  background: transparent;
  resize: none;
  font-size: 15.5px;
  line-height: 1.7;
  color: var(--c-text);
}

.composer-input::placeholder {
  color: var(--c-text-muted);
}

.composer-input:focus-visible {
  outline: none;
}

.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--c-line);
}

.composer-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.counter {
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: var(--c-text-muted);
  transition: color 0.2s var(--ease);
}

.counter.is-warning {
  color: var(--c-warn);
  font-weight: 600;
}

.counter.is-over {
  color: var(--c-danger);
  font-weight: 600;
}

.hint {
  font-size: 11.5px;
  color: var(--c-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-primary {
  flex: none;
  min-height: 40px;
  padding: 0 22px;
  border: 0;
  border-radius: var(--radius-pill);
  background: linear-gradient(135deg, var(--c-primary), var(--c-primary-soft) 55%, var(--c-accent));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: var(--shadow-btn);
  transition: transform 0.16s var(--ease), box-shadow 0.2s var(--ease), filter 0.2s var(--ease);
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.06);
  box-shadow: 0 12px 26px -8px rgba(79, 70, 229, 0.8);
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.97);
}

.btn-primary:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  box-shadow: none;
  cursor: not-allowed;
}

.btn-primary:focus-visible {
  outline: 2px solid var(--c-primary-soft);
  outline-offset: 2px;
}

.status {
  margin-top: 6px;
  padding-left: 52px;
  font-size: 12.5px;
  color: var(--c-text-muted);
}

.status:empty {
  display: none;
}

.status.is-error {
  color: var(--c-danger);
}

.status.is-success {
  color: var(--c-success);
}

@media (max-width: 640px) {
  .composer {
    padding: 16px 14px 12px;
  }

  .composer-form {
    gap: 10px;
  }

  .composer-avatar {
    width: 34px;
    height: 34px;
    font-size: 13px;
  }

  .status {
    padding-left: 44px;
  }

  .composer-footer {
    flex-wrap: wrap;
  }

  .hint {
    display: none;
  }

  .btn-primary {
    min-height: 44px;
    padding: 0 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .composer:focus-within {
    transform: none;
  }
}
</style>
