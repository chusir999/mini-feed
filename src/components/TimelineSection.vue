<script setup lang="ts">
import { computed, ref } from 'vue'
import EmptyState from './EmptyState.vue'
import PostItem from './PostItem.vue'
import type { Post } from '@/types'

type TimelineFilter = 'all' | 'favorited'

const props = withDefaults(
  defineProps<{
    posts: Post[]
    pendingIds?: string[]
  }>(),
  { pendingIds: () => [] },
)

const emit = defineEmits<{
  'toggle-like': [id: string]
  'toggle-favorite': [id: string]
}>()

const filter = ref<TimelineFilter>('all')

const visiblePosts = computed(() =>
  filter.value === 'favorited' ? props.posts.filter((post) => post.favorited) : props.posts,
)

const isFilteringFavorites = computed(() => filter.value === 'favorited')

function isPending(id: string): boolean {
  return props.pendingIds.includes(id)
}

function selectFilter(next: TimelineFilter): void {
  filter.value = next
}
</script>

<template>
  <section class="timeline" aria-labelledby="timeline-heading">
    <div class="section-head">
      <h2 id="timeline-heading">时间线</h2>
      <div class="section-tools">
        <div class="timeline-filters" role="group" aria-label="按收藏筛选">
          <button
            type="button"
            class="filter-tab"
            :class="{ 'is-active': !isFilteringFavorites }"
            :aria-pressed="!isFilteringFavorites ? 'true' : 'false'"
            @click="selectFilter('all')"
          >
            全部
          </button>
          <button
            type="button"
            class="filter-tab"
            :class="{ 'is-active': isFilteringFavorites }"
            :aria-pressed="isFilteringFavorites ? 'true' : 'false'"
            @click="selectFilter('favorited')"
          >
            已收藏
          </button>
        </div>
        <span class="count">{{ props.posts.length }} 条记录</span>
      </div>
    </div>

    <ul v-if="visiblePosts.length > 0" class="post-list">
      <PostItem
        v-for="post in visiblePosts"
        :key="post.id"
        :post="post"
        :busy="isPending(post.id)"
        @toggle-like="emit('toggle-like', $event)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
    </ul>
    <EmptyState v-else-if="!isFilteringFavorites" />
    <div v-else class="empty card">
      <p class="empty-title">还没有收藏的内容</p>
      <p class="empty-desc">点击记录下方的星标，就能把想回看的内容收进这里。</p>
    </div>
  </section>
</template>

<style scoped>
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin: 0 4px 12px;
}

.section-head h2 {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--c-text-soft);
}

.section-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.timeline-filters {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-pill);
  background: var(--c-surface-alt);
}

.filter-tab {
  padding: 4px 12px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--c-text-muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s var(--ease), background-color 0.2s var(--ease),
    box-shadow 0.2s var(--ease);
}

.filter-tab:hover {
  color: var(--c-text-soft);
}

.filter-tab:focus-visible {
  outline: 2px solid var(--c-primary-soft);
  outline-offset: 2px;
}

.filter-tab.is-active {
  background: var(--c-surface);
  color: var(--c-primary);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
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

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 24px 42px;
  border-style: dashed;
  border-color: #dfe5f7;
  background: rgba(255, 255, 255, 0.6);
  box-shadow: none;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-text-soft);
}

.empty-desc {
  max-width: 320px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--c-text-muted);
}

@media (max-width: 640px) {
  .section-tools {
    gap: 8px;
  }

  .filter-tab {
    padding: 4px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .filter-tab {
    transition: none;
  }
}
</style>
