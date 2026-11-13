export interface Post {
  id: string
  text: string
  createdAt: number
  /** 点赞总数 */
  likeCount: number
  /** 当前用户是否已点赞 */
  liked: boolean
  /** 收藏总数 */
  favoriteCount: number
  /** 当前用户是否已收藏 */
  favorited: boolean
}

export type PostReaction = 'like' | 'favorite'

export type PublishFailureReason = 'empty' | 'too-long' | 'server'

export type PublishResult =
  | { ok: true; post: Post }
  | { ok: false; reason: PublishFailureReason }

export interface StatusMessage {
  type: 'success' | 'error'
  message: string
}
