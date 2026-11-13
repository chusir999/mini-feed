export interface Post {
  id: string
  text: string
  createdAt: number
}

export type PublishFailureReason = 'empty' | 'too-long' | 'storage'

export type PublishResult =
  | { ok: true; post: Post }
  | { ok: false; reason: PublishFailureReason }

export interface StatusMessage {
  type: 'success' | 'error'
  message: string
}
