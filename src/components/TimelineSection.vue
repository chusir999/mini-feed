<script setup lang="ts">
import EmptyState from './EmptyState.vue'
import PostItem from './PostItem.vue'
import type { Post } from '@/types'

const props = defineProps<{
  posts: Post[]
}>()
</script>

<template>
  <section class="timeline" aria-labelledby="timeline-heading">
    <div class="section-head">
      <h2 id="timeline-heading">时间线</h2>
      <span class="count">{{ props.posts.length }} 条记录</span>
    </div>

    <ul v-if="props.posts.length > 0" class="post-list">
      <PostItem v-for="post in props.posts" :key="post.id" :post="post" />
    </ul>
    <EmptyState v-else />
  </section>
</template>

<style scoped>
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0 4px 12px;
}

.section-head h2 {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--c-text-soft);
}

.count {
  font-size: 12.5px;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
