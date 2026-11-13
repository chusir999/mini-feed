import { MAX_POSTS } from '../src/lib/constants'
import type { Post } from '../src/types'

export interface PostStoreOptions {
  now?: () => number
  generateId?: () => string
}

export interface PostStore {
  readonly size: number
  list(): Post[]
  add(text: string): Post
  setLiked(id: string, liked: boolean): Post | null
  setFavorited(id: string, favorited: boolean): Post | null
  clear(): void
}

let fallbackSequence = 0

interface StoredPost extends Post {
  seq: number
}

function defaultGenerateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  fallbackSequence += 1
  return `post-${Date.now().toString(36)}-${fallbackSequence}`
}

export function createPostStore(options: PostStoreOptions = {}): PostStore {
  const now = options.now ?? (() => Date.now())
  const generateId = options.generateId ?? defaultGenerateId
  const posts: StoredPost[] = []
  let nextSeq = 0

  const toPost = (post: StoredPost): Post => ({
    id: post.id,
    text: post.text,
    createdAt: post.createdAt,
    likeCount: post.likeCount,
    liked: post.liked,
    favoriteCount: post.favoriteCount,
    favorited: post.favorited,
  })

  return {
    get size(): number {
      return posts.length
    },

    list(): Post[] {
      return [...posts]
        .sort((left, right) => right.createdAt - left.createdAt || right.seq - left.seq)
        .map(toPost)
    },

    add(text: string): Post {
      const post: StoredPost = {
        id: generateId(),
        text,
        createdAt: now(),
        likeCount: 0,
        liked: false,
        favoriteCount: 0,
        favorited: false,
        seq: nextSeq,
      }
      nextSeq += 1
      posts.push(post)
      if (posts.length > MAX_POSTS) {
        posts.splice(0, posts.length - MAX_POSTS)
      }
      return toPost(post)
    },

    setLiked(id: string, liked: boolean): Post | null {
      const post = posts.find((item) => item.id === id)
      if (!post) {
        return null
      }
      if (post.liked !== liked) {
        post.liked = liked
        post.likeCount = liked ? post.likeCount + 1 : Math.max(0, post.likeCount - 1)
      }
      return toPost(post)
    },

    setFavorited(id: string, favorited: boolean): Post | null {
      const post = posts.find((item) => item.id === id)
      if (!post) {
        return null
      }
      if (post.favorited !== favorited) {
        post.favorited = favorited
        post.favoriteCount = favorited
          ? post.favoriteCount + 1
          : Math.max(0, post.favoriteCount - 1)
      }
      return toPost(post)
    },

    clear(): void {
      posts.length = 0
      nextSeq = 0
    },
  }
}
