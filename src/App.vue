<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader from '@/components/AppHeader.vue'
import PostComposer from '@/components/PostComposer.vue'
import TimelineSection from '@/components/TimelineSection.vue'
import { MAX_LENGTH } from '@/lib/constants'
import { usePostsStore } from '@/stores/posts'
import type { StatusMessage } from '@/types'

const store = usePostsStore()
const { posts } = storeToRefs(store)

const composer = ref<InstanceType<typeof PostComposer> | null>(null)
const status = ref<StatusMessage | null>(null)
let statusTimer: ReturnType<typeof setTimeout> | undefined

function setStatus(type: StatusMessage['type'], message: string): void {
  status.value = { type, message }

  if (statusTimer) clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    status.value = null
  }, 2600)
}

function handleSubmit(text: string): void {
  const result = store.publish(text)

  if (result.ok) {
    setStatus('success', '发布成功。')
    composer.value?.reset()
    return
  }

  if (result.reason === 'empty') {
    setStatus('error', '内容不能为空。')
    return
  }

  if (result.reason === 'too-long') {
    setStatus('error', `内容超出 ${MAX_LENGTH} 字上限。`)
    return
  }

  setStatus('error', store.lastError ?? '保存失败。')
}

onMounted(() => {
  store.hydrate()
})

onBeforeUnmount(() => {
  if (statusTimer) clearTimeout(statusTimer)
})
</script>

<template>
  <div class="bg-orbs" aria-hidden="true">
    <span class="orb orb-1"></span>
    <span class="orb orb-2"></span>
  </div>

  <div class="page">
    <AppHeader />

    <main>
      <PostComposer ref="composer" :status="status" @submit="handleSubmit" />
      <TimelineSection :posts="posts" />
    </main>

    <footer class="footer">
      <p>数据仅存储于本地浏览器，清除浏览器数据将丢失内容。</p>
      <p class="version">微记 MiniFeed · v2.0.0</p>
    </footer>
  </div>
</template>
