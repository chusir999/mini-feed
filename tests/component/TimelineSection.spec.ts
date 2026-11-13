import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TimelineSection from '@/components/TimelineSection.vue'
import type { Post } from '@/types'

function buildPost(overrides: Partial<Post> = {}): Post {
  return {
    id: overrides.id ?? 'post-1',
    text: overrides.text ?? '一条记录',
    createdAt: overrides.createdAt ?? Date.now(),
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
