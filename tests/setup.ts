import { afterEach, beforeEach } from 'vitest'
import { resetFakeApi } from './helpers/fake-api'

function resetEnvironment(): void {
  // node 环境的后端测试没有 window，避免触碰浏览器 API
  if (typeof window === 'undefined') {
    return
  }
  resetFakeApi()
}

beforeEach(() => {
  resetEnvironment()
})

afterEach(() => {
  resetEnvironment()
})
