import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PostComposer from '@/components/PostComposer.vue'

function mountComposer() {
  return mount(PostComposer)
}

describe('PostComposer', () => {
  it('初始状态为空且发布按钮禁用', () => {
    const wrapper = mountComposer()

    expect(wrapper.find('textarea').element.value).toBe('')
    expect(wrapper.find('.counter').text()).toBe('0/280')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('输入内容后更新字数并启用按钮', async () => {
    const wrapper = mountComposer()
    await wrapper.find('textarea').setValue('你好')

    expect(wrapper.find('.counter').text()).toBe('2/280')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('仅输入空白字符时按钮保持禁用', async () => {
    const wrapper = mountComposer()
    await wrapper.find('textarea').setValue('   ')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('接近上限时计数进入警示态', async () => {
    const wrapper = mountComposer()
    await wrapper.find('textarea').setValue('字'.repeat(240))

    expect(wrapper.find('.counter').classes()).toContain('is-warning')
  })

  it('提交时发出去除首尾空白的内容', async () => {
    const wrapper = mountComposer()
    await wrapper.find('textarea').setValue('  发布这条内容  ')
    await wrapper.find('form').trigger('submit')

    const events = wrapper.emitted('submit')
    expect(events).toHaveLength(1)
    expect(events?.[0]).toEqual(['发布这条内容'])
  })

  it('支持 Ctrl + Enter 快捷发布', async () => {
    const wrapper = mountComposer()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('快捷发布')
    await textarea.trigger('keydown', { key: 'Enter', ctrlKey: true })

    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('reset 会清空输入并回焦', async () => {
    // 焦点断言需要组件真实挂载到 document 上
    const wrapper = mount(PostComposer, { attachTo: document.body })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('需要清空')

    wrapper.vm.reset()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
    expect(document.activeElement).toBe(textarea.element)
    expect(wrapper.find('.counter').text()).toBe('0/280')

    wrapper.unmount()
  })

  it('显示外部传入的状态提示', () => {
    const wrapper = mount(PostComposer, {
      props: { status: { type: 'error', message: '内容不能为空。' } },
    })

    expect(wrapper.find('.status').text()).toBe('内容不能为空。')
    expect(wrapper.find('.status').classes()).toContain('is-error')
  })

  it('busy 时发布按钮禁用', async () => {
    const wrapper = mount(PostComposer, { props: { busy: true } })
    await wrapper.find('textarea').setValue('请求进行中')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
