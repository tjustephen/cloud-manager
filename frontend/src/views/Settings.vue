<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>系统设置</h1>
        <p>配置 Telegram 通知相关参数</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="font-size:15px;font-weight:600;margin-bottom:16px">Telegram 通知</h3>
      <div class="form-group">
        <label>Bot Token</label>
        <input
          v-model="tgForm.botToken"
          class="form-control"
          type="password"
          placeholder="请输入 Telegram Bot Token"
        />
      </div>
      <div class="form-group">
        <label>Chat ID</label>
        <input
          v-model="tgForm.chatId"
          class="form-control"
          placeholder="请输入个人或群组 Chat ID"
        />
      </div>
      <button class="btn btn-primary" @click="saveTg" :disabled="savingTg">
        {{ savingTg ? '保存中...' : '保存 Telegram 配置' }}
      </button>
    </div>

    <div class="card">
      <h3 style="font-size:15px;font-weight:600;margin-bottom:12px">关于</h3>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--text-secondary)">
        <div>版本：<span style="color:var(--text-primary)">1.0.0</span></div>
        <div>后端：<a href="http://localhost:3001/api/health" target="_blank" style="color:var(--accent)">http://localhost:3001</a></div>
        <div>技术栈：Express.js / Vue 3 / Vite / lowdb</div>
        <div>支持的云：Oracle Cloud / AWS</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { settingsApi } from '../api/index.js'

const tgForm = ref({ botToken: '', chatId: '' })
const savingTg = ref(false)

onMounted(async () => {
  try {
    const res = await settingsApi.get()
    const settings = res.data || {}
    tgForm.value.botToken = settings.telegram?.botToken || ''
    tgForm.value.chatId = settings.telegram?.chatId || ''
  } catch (_) {}
})

async function saveTg() {
  savingTg.value = true
  try {
    await settingsApi.updateTelegram(tgForm.value)
    window.$toast?.('Telegram 配置已保存', 'success')
  } catch (e) {
    window.$toast?.(e.response?.data?.error || e.message, 'error')
  } finally {
    savingTg.value = false
  }
}
</script>
