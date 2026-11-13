<script setup lang="ts">
import { computed } from 'vue'
import { formatRelativeTime } from '@/lib/time'
import type { Post } from '@/types'

const props = defineProps<{
  post: Post
}>()

const relativeTime = computed(() => formatRelativeTime(props.post.createdAt))
const isoTime = computed(() => new Date(props.post.createdAt).toISOString())
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

@media (max-width: 640px) {
  .post {
    padding: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post:hover {
    transform: none;
  }
}
</style>
