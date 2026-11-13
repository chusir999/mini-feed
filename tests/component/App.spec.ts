import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import App from '@/App.vue'
import { STORAGE_KEY } from '@/lib/constants'
import type { Post } from '@/types'

function mountApp() {
  return mount(App, { global: { plugins: [createPinia()] } })
}

async function publish(wrapper: ReturnType<typeof mountApp>, text: string) {
  await wrapper.find('textarea').setValue(text)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('App 整体流程', () => {
  it('初始展示空状态', () => {
    const wrapper = mountApp()

    expect(wrapper.find('.empty').exists()).toBe(true)
    expect(wrapper.find('.count').text()).toBe('0 条记录')
  })

  it('输入并发布后列表更新、输入清空且写入本地存储', async () => {
    const wrapper = mountApp()
    await publish(wrapper, '第一条记录：今天开始用微记。')

    expect(wrapper.findAll('.post')).toHaveLength(1)
    expect(wrapper.find('.post-text').text()).toBe('第一条记录：今天开始用微记。')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
    expect(wrapper.find('.status').text()).toContain('发布成功')
    expect(wrapper.find('.count').text()).toBe('1 条记录')

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string) as Post[]
    expect(saved).toHaveLength(1)
  })

  it('重新挂载后从本地存储恢复内容（模拟刷新）', async () => {
    const first = mountApp()
    await publish(first, '刷新后仍应存在')
    first.unmount()

    const second = mountApp()
    await flushPromises()

    expect(second.findAll('.post')).toHaveLength(1)
    expect(second.find('.post-text').text()).toBe('刷新后仍应存在')
  })

  it('发布多条后最新的排在最前', async () => {
    const wrapper = mountApp()
    await publish(wrapper, '较早的内容')
    await publish(wrapper, '较新的内容')

    const texts = wrapper.findAll('.post-text').map((node) => node.text())
    expect(texts).toEqual(['较新的内容', '较早的内容'])
  })

  it('HTML 内容以纯文本呈现且不执行脚本', async () => {
    const wrapper = mountApp()
    await publish(wrapper, '<img src=x onerror="window.__xss = 1">纯文本')

    expect(wrapper.find('.post-text img').exists()).toBe(false)
    expect(wrapper.find('.post-text').text()).toContain('<img src=x onerror="window.__xss = 1">')
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined()
  })

  it('空白内容不会产生新记录', async () => {
    const wrapper = mountApp()
    await publish(wrapper, '    ')

    expect(wrapper.findAll('.post')).toHaveLength(0)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
