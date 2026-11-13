import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TimelineSection from '@/components/TimelineSection.vue'
import type { Post } from '@/types'

function buildPost(overrides: Partial<Post> = {}): Post {
  return {
    id: overrides.id ?? 'post-1',
    text: overrides.text ?? '一条记录',
    createdAt: overrides.createdAt ?? Date.now(),
    likeCount: overrides.likeCount ?? 0,
    liked: overrides.liked ?? false,
    favoriteCount: overrides.favoriteCount ?? 0,
    favorited: overrides.favorited ?? false,
  }
}

describe('TimelineSection 空状态', () => {
  it('没有内容时展示空状态与计数', () => {
    const wrapper = mount(TimelineSection, { props: { posts: [] } })

    expect(wrapper.find('.empty').exists()).toBe(true)
    expect(wrapper.find('.empty').text()).toContain('还没有任何记录')
    expect(wrapper.findAll('.post')).toHaveLength(0)
    expect(wrapper.find('.count').text()).toBe('0 条记录')
  })
})

describe('TimelineSection 列表', () => {
  it('按传入顺序渲染每条记录与计数', () => {
    const posts = [
      buildPost({ id: 'new', text: '最新的一条', createdAt: Date.now() }),
      buildPost({ id: 'old', text: '较早的一条', createdAt: Date.now() - 60_000 }),
    ]
    const wrapper = mount(TimelineSection, { props: { posts } })

    const items = wrapper.findAll('.post')
    expect(items).toHaveLength(2)
    expect(items[0]?.text()).toContain('最新的一条')
    expect(items[1]?.text()).toContain('较早的一条')
    expect(wrapper.find('.count').text()).toBe('2 条记录')
    expect(wrapper.find('.empty').exists()).toBe(false)
  })

  it('正文中的 HTML 以纯文本展示', () => {
    const wrapper = mount(TimelineSection, {
      props: { posts: [buildPost({ text: '<b>加粗？</b><img src=x onerror="alert(1)">' })] },
    })

    const text = wrapper.find('.post-text')
    expect(text.text()).toBe('<b>加粗？</b><img src=x onerror="alert(1)">')
    expect(text.element.children).toHaveLength(0)
    expect(wrapper.find('.post-text b').exists()).toBe(false)
    expect(wrapper.find('.post-text img').exists()).toBe(false)
  })

  it('展示相对时间', () => {
    const wrapper = mount(TimelineSection, {
      props: { posts: [buildPost({ createdAt: Date.now() })] },
    })

    expect(wrapper.find('.post-time').text()).toBe('刚刚')
  })
})

describe('TimelineSection 点赞与收藏', () => {
  it('每条记录渲染点赞与收藏按钮及其计数', () => {
    const wrapper = mount(TimelineSection, {
      props: {
        posts: [
          buildPost({ id: 'post-1', likeCount: 3, liked: true, favoriteCount: 2, favorited: true }),
        ],
      },
    })

    const like = wrapper.find('.action-like')
    const favorite = wrapper.find('.action-favorite')

    expect(like.exists()).toBe(true)
    expect(favorite.exists()).toBe(true)
    expect(wrapper.find('.post-actions').exists()).toBe(true)
    expect(like.text()).toContain('♥ 3')
    expect(favorite.text()).toContain('★ 2')
    expect(like.classes()).toContain('is-active')
    expect(favorite.classes()).toContain('is-active')
    expect(like.attributes('aria-pressed')).toBe('true')
    expect(favorite.attributes('aria-pressed')).toBe('true')
    expect(like.attributes('aria-label')).toBe('取消点赞')
    expect(favorite.attributes('aria-label')).toBe('取消收藏')
  })

  it('未点赞未收藏时按钮为非激活态', () => {
    const wrapper = mount(TimelineSection, {
      props: { posts: [buildPost({ likeCount: 0, favoriteCount: 0 })] },
    })

    const like = wrapper.find('.action-like')
    const favorite = wrapper.find('.action-favorite')

    expect(like.classes()).not.toContain('is-active')
    expect(favorite.classes()).not.toContain('is-active')
    expect(like.attributes('aria-pressed')).toBe('false')
    expect(favorite.attributes('aria-pressed')).toBe('false')
    expect(like.attributes('aria-label')).toBe('点赞')
    expect(favorite.attributes('aria-label')).toBe('收藏')
    expect(like.text()).toContain('♥ 0')
    expect(favorite.text()).toContain('★ 0')
  })

  it('点击按钮向上派发事件并携带记录 id', async () => {
    const wrapper = mount(TimelineSection, {
      props: { posts: [buildPost({ id: 'post-9' })] },
    })

    await wrapper.find('.action-like').trigger('click')
    await wrapper.find('.action-favorite').trigger('click')

    expect(wrapper.emitted('toggle-like')).toEqual([['post-9']])
    expect(wrapper.emitted('toggle-favorite')).toEqual([['post-9']])
  })

  it('pendingIds 中的记录按钮为禁用态', () => {
    const wrapper = mount(TimelineSection, {
      props: {
        posts: [buildPost({ id: 'post-1' }), buildPost({ id: 'post-2' })],
        pendingIds: ['post-2'],
      },
    })

    const items = wrapper.findAll('.post')
    expect(items[0]?.find('.action-like').attributes('disabled')).toBeUndefined()
    expect(items[1]?.find('.action-like').attributes('disabled')).toBeDefined()
    expect(items[1]?.find('.action-favorite').attributes('disabled')).toBeDefined()
  })
})

describe('TimelineSection 收藏筛选', () => {
  it('默认选中「全部」且展示所有记录', () => {
    const wrapper = mount(TimelineSection, {
      props: {
        posts: [
          buildPost({ id: 'a', text: '未收藏的记录' }),
          buildPost({ id: 'b', text: '已收藏的记录', favorited: true, favoriteCount: 1 }),
        ],
      },
    })

    const tabs = wrapper.findAll('.filter-tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]?.text()).toBe('全部')
    expect(tabs[1]?.text()).toBe('已收藏')
    expect(tabs[0]?.classes()).toContain('is-active')
    expect(tabs[0]?.attributes('aria-pressed')).toBe('true')
    expect(tabs[1]?.attributes('aria-pressed')).toBe('false')
    expect(wrapper.findAll('.post')).toHaveLength(2)
  })

  it('切换「已收藏」后只渲染收藏项且计数仍为总条数', async () => {
    const wrapper = mount(TimelineSection, {
      props: {
        posts: [
          buildPost({ id: 'a', text: '未收藏的记录' }),
          buildPost({ id: 'b', text: '已收藏的记录', favorited: true, favoriteCount: 1 }),
        ],
      },
    })

    await wrapper.findAll('.filter-tab')[1]?.trigger('click')

    const items = wrapper.findAll('.post')
    expect(items).toHaveLength(1)
    expect(items[0]?.text()).toContain('已收藏的记录')
    expect(wrapper.find('.count').text()).toBe('2 条记录')
    expect(wrapper.findAll('.filter-tab')[1]?.classes()).toContain('is-active')
    expect(wrapper.findAll('.filter-tab')[1]?.attributes('aria-pressed')).toBe('true')
  })

  it('没有收藏内容时展示「还没有收藏的内容」', async () => {
    const wrapper = mount(TimelineSection, {
      props: {
        posts: [buildPost({ id: 'a', text: '未收藏的记录' })],
      },
    })

    await wrapper.findAll('.filter-tab')[1]?.trigger('click')

    expect(wrapper.findAll('.post')).toHaveLength(0)
    expect(wrapper.find('.empty').exists()).toBe(true)
    expect(wrapper.find('.empty').text()).toContain('还没有收藏的内容')
    expect(wrapper.find('.count').text()).toBe('1 条记录')
  })
})
