import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  ApiError,
  createPost,
  fetchPosts,
  setPostFavorited,
  setPostLiked,
} from '@/lib/api'
import { MAX_LENGTH, MAX_POSTS } from '@/lib/constants'
import type { Post, PublishResult, PostReaction } from '@/types'

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
  /** 正在等待后端确认的点赞/收藏记录 id（同一记录同一时刻最多一个在途请求） */
  const pendingReactionIds = ref<string[]>([])

  const count = computed(() => posts.value.length)

  function isReacting(id: string): boolean {
    return pendingReactionIds.value.includes(id)
  }

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

  /** 用同 id 的新记录覆盖原位置，保持列表顺序（不重排、不重建整个数组） */
  function replacePost(id: string, next: Post): void {
    const index = posts.value.findIndex((post) => post.id === id)
    if (index === -1) return

    posts.value.splice(index, 1, next)
  }

  /** 本地先行翻转状态并同步 ±1 计数，计数不低于 0 */
  function buildOptimisticPost(post: Post, reaction: PostReaction): Post {
    if (reaction === 'like') {
      const liked = !post.liked
      return { ...post, liked, likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1)) }
    }

    const favorited = !post.favorited
    return {
      ...post,
      favorited,
      favoriteCount: Math.max(0, post.favoriteCount + (favorited ? 1 : -1)),
    }
  }

  async function toggleReaction(id: string, reaction: PostReaction): Promise<boolean> {
    const index = posts.value.findIndex((post) => post.id === id)
    if (index === -1) return false
    // 同一记录已有在途请求时直接忽略，防连点重复提交
    if (isReacting(id)) return false

    const current = posts.value[index]
    if (!current) return false

    const snapshot: Post = { ...current }
    const optimistic = buildOptimisticPost(current, reaction)
    const label = reaction === 'like' ? '点赞' : '收藏'

    posts.value.splice(index, 1, optimistic)
    pendingReactionIds.value = [...pendingReactionIds.value, id]

    try {
      const saved =
        reaction === 'like'
          ? await setPostLiked(id, optimistic.liked)
          : await setPostFavorited(id, optimistic.favorited)

      replacePost(id, saved)
      lastError.value = null
      return true
    } catch (error) {
      replacePost(id, snapshot)
      lastError.value = `${label}失败：${describeError(error)}`
      return false
    } finally {
      pendingReactionIds.value = pendingReactionIds.value.filter((item) => item !== id)
    }
  }

  /** 切换点赞；找不到记录或已有在途请求时返回 false 且不发请求 */
  function toggleLike(id: string): Promise<boolean> {
    return toggleReaction(id, 'like')
  }

  /** 切换收藏；找不到记录或已有在途请求时返回 false 且不发请求 */
  function toggleFavorite(id: string): Promise<boolean> {
    return toggleReaction(id, 'favorite')
  }

  return {
    posts,
    count,
    lastError,
    isLoading,
    isPublishing,
    pendingReactionIds,
    isReacting,
    hydrate,
    publish,
    toggleLike,
    toggleFavorite,
  }
})
