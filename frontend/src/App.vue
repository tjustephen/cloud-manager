<template>
  <!-- Sidebar -->
  <nav class="sidebar">
    <div class="sidebar-brand">
      <span class="brand-icon">☁️</span>
      <span class="brand-text">云管理平台</span>
    </div>

    <div class="nav-section">
      <div class="nav-label">概览</div>
      <router-link to="/" class="nav-item">
        <span>📊</span> 仪表板
      </router-link>
    </div>

    <div class="nav-section">
      <div class="nav-label">管理</div>
      <router-link to="/accounts" class="nav-item">
        <span>👤</span> 账户管理
      </router-link>
      <router-link to="/cloud" class="nav-item">
        <span>☁️</span> 云实例
      </router-link>
      <router-link to="/dns" class="nav-item">
        <span>🌐</span> DNS 管理
      </router-link>
    </div>

    <div class="nav-section">
      <div class="nav-label">系统</div>
      <router-link to="/tasks" class="nav-item">
        <span>⚙️</span> 任务队列
        <span v-if="pendingCount > 0" class="nav-badge">{{ pendingCount }}</span>
      </router-link>
      <router-link to="/settings" class="nav-item">
        <span>🔧</span> 系统设置
      </router-link>
    </div>
  </nav>

  <!-- Main content -->
  <main class="main-content">
    <router-view />
  </main>

  <!-- Toast container -->
  <div class="toast-container">
    <div v-for="t in toasts" :key="t.id" :class="['toast', `toast-${t.type}`]">
      {{ t.message }}
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const pendingCount = ref(0)
const toasts = ref([])
let sseSource = null

// SSE connection for task updates
onMounted(() => {
  connectSSE()
})

onUnmounted(() => {
  if (sseSource) sseSource.close()
})

function connectSSE() {
  sseSource = new EventSource('/api/tasks/stream')
  sseSource.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.event === 'init') {
      pendingCount.value = data.tasks.filter(t => ['pending', 'running'].includes(t.status)).length
    } else if (data.event === 'task:created') {
      pendingCount.value++
    } else if (data.event === 'task:updated') {
      const t = data.task
      if (['done', 'failed', 'cancelled'].includes(t.status)) {
        pendingCount.value = Math.max(0, pendingCount.value - 1)
        if (t.status === 'done') showToast('任务完成: ' + t.type, 'success')
        if (t.status === 'failed') showToast('任务失败: ' + (t.error || t.type), 'error')
      }
    }
  }
  sseSource.onerror = () => {
    setTimeout(connectSSE, 5000)
  }
}

function showToast(message, type = 'info') {
  const id = Date.now()
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 4000)
}

// Expose for child components
window.$toast = showToast
</script>

<style>
.sidebar {
  width: 220px;
  min-width: 220px;
  height: 100vh;
  overflow-y: auto;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  gap: 4px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px 20px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.brand-icon {
  font-size: 24px;
}

.nav-section {
  margin-bottom: 8px;
}

.nav-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 8px 8px 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
  position: relative;
}

.nav-item:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.nav-item.router-link-active {
  background: var(--accent-dim);
  color: var(--accent);
}

.nav-badge {
  margin-left: auto;
  background: var(--accent);
  color: white;
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  padding: 1px 7px;
  min-width: 20px;
  text-align: center;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
