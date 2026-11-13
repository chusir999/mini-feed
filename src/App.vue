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

async function handleSubmit(text: string): Promise<void> {
  const result = await store.publish(text)

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

  setStatus('error', store.lastError ?? '发布失败，请稍后再试。')
}

onMounted(async () => {
  await store.hydrate()

  if (store.lastError) {
    setStatus('error', '加载失败，请确认后端服务已启动。')
  }
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
      <PostComposer
        ref="composer"
        :status="status"
        :busy="store.isPublishing"
        @submit="handleSubmit"
      />
      <TimelineSection :posts="posts" />
    </main>

    <footer class="footer">
      <p>内容保存在本地服务的进程内存中，服务重启后会清空。</p>
      <p class="version">微记 MiniFeed · v3.0.0</p>
    </footer>
  </div>
</template>
