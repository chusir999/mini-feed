<script setup lang="ts"></script>

<template>
  <div class="empty card">
    <svg class="empty-art" viewBox="0 0 120 96" role="img" aria-label="空记录插画">
      <defs>
        <linearGradient id="paperGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#EEF1FB" />
          <stop offset="100%" stop-color="#E0E7FF" />
        </linearGradient>
        <linearGradient id="bubbleGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#6366F1" />
          <stop offset="100%" stop-color="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="18" y="14" width="60" height="72" rx="10" fill="url(#paperGrad)" stroke="#D8DEF5" />
      <rect x="30" y="30" width="34" height="4" rx="2" fill="#C7D2FE" />
      <rect x="30" y="42" width="26" height="4" rx="2" fill="#D8DEF5" />
      <rect x="30" y="54" width="30" height="4" rx="2" fill="#D8DEF5" />
      <path
        d="M62 46h30a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8h-8l-9 9v-9H62a8 8 0 0 1-8-8V54a8 8 0 0 1 8-8Z"
        fill="url(#bubbleGrad)"
        opacity="0.9"
      />
      <circle cx="71" cy="63" r="3" fill="#fff" />
      <circle cx="80" cy="63" r="3" fill="#fff" opacity="0.8" />
      <circle cx="89" cy="63" r="3" fill="#fff" opacity="0.6" />
    </svg>
    <p class="empty-title">还没有任何记录</p>
    <p class="empty-desc">写下第一条想法，它会保存在这台设备的浏览器里。</p>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 44px 24px 46px;
  border-style: dashed;
  border-color: #dfe5f7;
  background: rgba(255, 255, 255, 0.6);
  box-shadow: none;
}

.empty-art {
  width: 128px;
  height: auto;
  margin-bottom: 14px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-text-soft);
}

.empty-desc {
  max-width: 320px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--c-text-muted);
}

@media (max-width: 640px) {
  .empty {
    padding: 36px 18px 38px;
  }
}
</style>
