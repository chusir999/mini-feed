import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '@/App.vue'
import { installFakeApi } from '../helpers/fake-api'
import type { FakeApi } from '../helpers/fake-api'

let fake: FakeApi

beforeEach(() => {
  fake = installFakeApi()
})

function mountApp() {
  return mount(App, { global: { plugins: [createPinia()] } })
}

async function publish(wrapper: ReturnType<typeof mountApp>, text: string) {
  await wrapper.find('textarea').setValue(text)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('App 整体流程', () => {
  it('初始展示空状态并从后端加载列表', async () => {
    const wrapper = mountApp()
    await flushPromises()

    expect(wrapper.find('.empty').exists()).toBe(true)
    expect(wrapper.find('.count').text()).toBe('0 条记录')

    const requests = fake.requests()
    expect(requests).toHaveLength(1)
    expect(requests[0]?.method).toBe('GET')
    expect(requests[0]?.url).toBe('/api/posts')
  })

  it('发布后发出 POST 请求、列表更新且输入清空', async () => {
    const wrapper = mountApp()
    await flushPromises()
    await publish(wrapper, '第一条记录：今天开始用微记。')

    expect(wrapper.findAll('.post')).toHaveLength(1)
    expect(wrapper.find('.post-text').text()).toBe('第一条记录：今天开始用微记。')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
    expect(wrapper.find('.status').text()).toContain('发布成功')
    expect(wrapper.find('.count').text()).toBe('1 条记录')

    const postRequest = fake.requests().find((request) => request.method === 'POST')
    expect(postRequest?.url).toBe('/api/posts')
    expect(postRequest?.body).toEqual({ text: '第一条记录：今天开始用微记。' })
    expect(fake.list()).toHaveLength(1)
  })

  it('发布成功后不再写入 Local Storage', async () => {
    const wrapper = mountApp()
    await flushPromises()
    await publish(wrapper, '只应保存在后端的内容')

    expect(wrapper.findAll('.post')).toHaveLength(1)
    expect(window.localStorage.length).toBe(0)
  })

  it('重新挂载后从后端恢复内容（模拟刷新）', async () => {
    const first = mountApp()
    await flushPromises()
    await publish(first, '刷新后仍应存在')
    first.unmount()

    const second = mountApp()
    await flushPromises()

    expect(second.findAll('.post')).toHaveLength(1)
    expect(second.find('.post-text').text()).toBe('刷新后仍应存在')
    expect(window.localStorage.length).toBe(0)
  })

  it('后端不可用时提示加载失败', async () => {
    fake.setMode('network-error')

    const wrapper = mountApp()
    await flushPromises()

    expect(wrapper.find('.status').text()).toContain('加载失败，请确认后端服务已启动。')
    expect(wrapper.find('.status').classes()).toContain('is-error')
    expect(wrapper.findAll('.post')).toHaveLength(0)
  })

  it('发布失败时展示错误提示并保留草稿', async () => {
    const wrapper = mountApp()
    await flushPromises()

    fake.failNext(400, 'empty', '内容不能为空')
    await publish(wrapper, '服务端拒绝的内容')

    expect(wrapper.find('.status').text()).toContain('内容不能为空')
    expect(wrapper.find('.status').classes()).toContain('is-error')
    expect(wrapper.findAll('.post')).toHaveLength(0)
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(
      '服务端拒绝的内容',
    )
  })

  it('发布多条后最新的排在最前', async () => {
    const wrapper = mountApp()
    await flushPromises()
    await publish(wrapper, '较早的内容')
    await publish(wrapper, '较新的内容')

    const texts = wrapper.findAll('.post-text').map((node) => node.text())
    expect(texts).toEqual(['较新的内容', '较早的内容'])
  })

  it('HTML 内容以纯文本呈现且不执行脚本', async () => {
    const wrapper = mountApp()
    await flushPromises()
    await publish(wrapper, '<img src=x onerror="window.__xss = 1">纯文本')

    expect(wrapper.find('.post-text img').exists()).toBe(false)
    expect(wrapper.find('.post-text').text()).toContain('<img src=x onerror="window.__xss = 1">')
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined()
  })

  it('空白内容不会产生新记录也不会发出请求', async () => {
    const wrapper = mountApp()
    await flushPromises()
    await publish(wrapper, '    ')

    expect(wrapper.findAll('.post')).toHaveLength(0)
    expect(fake.requests().filter((request) => request.method === 'POST')).toHaveLength(0)
  })
})
