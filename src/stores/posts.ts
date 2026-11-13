import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError, createPost, fetchPosts } from '@/lib/api'
import { MAX_LENGTH, MAX_POSTS } from '@/lib/constants'
import type { Post, PublishResult } from '@/types'

function describeError(error: unknown): string {
  if (error instanceof ApiError && error.message.length > 0) {
    return error.message
  }

  return '未知错误'
}

export const usePostsStore = defineStore('posts', () => {
  const posts = ref<Post[]>([])
  const lastError = ref<string | null>(null)
  const isLoading = ref(false)
  const isPublishing = ref(false)

  const count = computed(() => posts.value.length)

  /** 从后端加载列表；失败时退化为空列表并记录可读错误 */
  async function hydrate(): Promise<void> {
    isLoading.value = true

    try {
      const loaded = await fetchPosts()
      posts.value = [...loaded]
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, MAX_POSTS)
      lastError.value = null
    } catch (error) {
      posts.value = []
      lastError.value = `加载失败：${describeError(error)}`
    } finally {
      isLoading.value = false
    }
  }

  /** 先本地校验（不发请求），再交给后端创建，成功后插入列表最前 */
  async function publish(rawText: string): Promise<PublishResult> {
    const text = rawText.trim()

    if (text.length === 0) return { ok: false, reason: 'empty' }
    if (text.length > MAX_LENGTH) return { ok: false, reason: 'too-long' }
    if (isPublishing.value) return { ok: false, reason: 'server' }

    isPublishing.value = true

    try {
      const post = await createPost(text)
      posts.value = [post, ...posts.value].slice(0, MAX_POSTS)
      lastError.value = null
      return { ok: true, post }
    } catch (error) {
      lastError.value = `发布失败：${describeError(error)}`
      return { ok: false, reason: 'server' }
    } finally {
      isPublishing.value = false
    }
  }

  return { posts, count, lastError, isLoading, isPublishing, hydrate, publish }
})
