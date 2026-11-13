<script setup lang="ts">
import { computed } from 'vue'
import { formatRelativeTime } from '@/lib/time'
import type { Post } from '@/types'

const props = withDefaults(
  defineProps<{
    post: Post
    busy?: boolean
  }>(),
  { busy: false },
)

const emit = defineEmits<{
  'toggle-like': [id: string]
  'toggle-favorite': [id: string]
}>()

const relativeTime = computed(() => formatRelativeTime(props.post.createdAt))
const isoTime = computed(() => new Date(props.post.createdAt).toISOString())
const likeLabel = computed(() => (props.post.liked ? '取消点赞' : '点赞'))
const favoriteLabel = computed(() => (props.post.favorited ? '取消收藏' : '收藏'))
</script>

<template>
  <li class="post card">
    <div class="post-avatar" aria-hidden="true">我</div>
    <div class="post-main">
      <div class="post-head">
        <span class="post-author">我</span>
        <time class="post-time" :datetime="isoTime">{{ relativeTime }}</time>
      </div>
      <p class="post-text">{{ props.post.text }}</p>
      <div class="post-actions">
        <button
          type="button"
          class="action-btn action-like"
          :class="{ 'is-active': props.post.liked }"
          :aria-pressed="props.post.liked ? 'true' : 'false'"
          :aria-label="likeLabel"
          :disabled="props.busy"
          @click="emit('toggle-like', props.post.id)"
        >
          ♥ {{ props.post.likeCount }}
        </button>
        <button
          type="button"
          class="action-btn action-favorite"
          :class="{ 'is-active': props.post.favorited }"
          :aria-pressed="props.post.favorited ? 'true' : 'false'"
          :aria-label="favoriteLabel"
          :disabled="props.busy"
          @click="emit('toggle-favorite', props.post.id)"
        >
          ★ {{ props.post.favoriteCount }}
        </button>
      </div>
    </div>
  </li>
</template>

<style scoped>
.post {
  display: flex;
  gap: 12px;
  padding: 16px 18px;
  transition: transform 0.22s var(--ease), box-shadow 0.22s var(--ease);
}

.post:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.post-avatar {
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

.post-main {
  flex: 1;
  min-width: 0;
}

.post-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 3px;
}

.post-author {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--c-text);
}

.post-time {
  font-size: 12.5px;
  color: var(--c-text-muted);
}

.post-text {
  font-size: 15px;
  line-height: 1.75;
  color: var(--c-text-soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-pill);
  background: var(--c-surface-alt);
  color: var(--c-text-muted);
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: color 0.2s var(--ease), background-color 0.2s var(--ease),
    border-color 0.2s var(--ease), transform 0.16s var(--ease);
}

.action-btn:hover:not(:disabled) {
  color: var(--c-text-soft);
  background: #e7ecf9;
  border-color: #d5dcf3;
}

.action-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.action-btn:focus-visible {
  outline: 2px solid var(--c-primary-soft);
  outline-offset: 2px;
}

.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-like.is-active {
  color: var(--c-danger);
  border-color: rgba(239, 68, 68, 0.34);
  background: rgba(239, 68, 68, 0.1);
}

.action-favorite.is-active {
  color: var(--c-warn);
  border-color: rgba(245, 158, 11, 0.36);
  background: rgba(245, 158, 11, 0.12);
}

@media (max-width: 640px) {
  .post {
    padding: 14px;
  }

  .action-btn {
    min-height: 36px;
    padding: 0 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post:hover {
    transform: none;
  }

  .action-btn {
    transition: none;
  }

  .action-btn:active:not(:disabled) {
    transform: none;
  }
}
</style>
