<script setup lang="ts"></script>

<template>
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true">微</div>
      <div class="brand-text">
        <h1 class="brand-name">微记</h1>
        <p class="brand-sub">MiniFeed · 记录此刻</p>
      </div>
    </div>
    <span class="badge" title="所有内容保存在本地后端服务的进程内存中，服务重启后会清空">
      <span class="badge-dot" aria-hidden="true"></span>
      服务端存储
    </span>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-mark {
  display: grid;
  place-items: center;
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: linear-gradient(135deg, var(--c-primary), var(--c-accent));
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  box-shadow: 0 10px 22px -10px rgba(79, 70, 229, 0.9);
}

.brand-name {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  background: linear-gradient(120deg, #1e1b4b, #4f46e5 60%, #8b5cf6);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.brand-sub {
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--c-text-muted);
  letter-spacing: 0.04em;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  padding: 7px 13px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.7);
  color: var(--c-text-soft);
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-success);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.16);
}

@media (max-width: 640px) {
  .brand-mark {
    width: 42px;
    height: 42px;
    font-size: 18px;
    border-radius: 13px;
  }

  .brand-name {
    font-size: 22px;
  }

  .badge {
    padding: 6px 10px;
    font-size: 11.5px;
  }
}

@media (max-width: 380px) {
  .badge {
    display: none;
  }
}
</style>
