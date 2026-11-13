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
      const post: StoredPost = { id: generateId(), text, createdAt: now(), seq: nextSeq }
      nextSeq += 1
      posts.push(post)
      if (posts.length > MAX_POSTS) {
        posts.splice(0, posts.length - MAX_POSTS)
      }
      return toPost(post)
    },

    clear(): void {
      posts.length = 0
      nextSeq = 0
    },
  }
}
