import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { MAX_LENGTH, MAX_POSTS } from '@/lib/constants'
import { loadPosts, savePosts } from '@/lib/storage'
import type { Post, PublishResult } from '@/types'

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const usePostsStore = defineStore('posts', () => {
  const posts = ref<Post[]>([])
  const lastError = ref<string | null>(null)

  const count = computed(() => posts.value.length)

  /** 从 localStorage 恢复数据，失败时 store 保持空列表 */
  function hydrate(): void {
    posts.value = loadPosts()
    lastError.value = null
  }

  /** 校验、落盘、再更新内存，保证界面与本地数据一致 */
  function publish(rawText: string): PublishResult {
    const text = rawText.trim()

    if (!text) return { ok: false, reason: 'empty' }
    if (text.length > MAX_LENGTH) return { ok: false, reason: 'too-long' }

    const post: Post = { id: createId(), text, createdAt: Date.now() }
    const next = [post, ...posts.value].slice(0, MAX_POSTS)

    if (!savePosts(next)) {
      lastError.value = '保存失败：浏览器存储不可用或已写满。'
      return { ok: false, reason: 'storage' }
    }

    posts.value = next
    lastError.value = null

    return { ok: true, post }
  }

  return { posts, count, lastError, hydrate, publish }
})
