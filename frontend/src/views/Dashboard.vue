<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>仪表板</h1>
        <p>所有账户的实例状态总览</p>
      </div>
      <button class="btn btn-ghost" @click="loadAll" :disabled="loading">
        <span :class="loading ? 'spinner' : ''">{{ loading ? '' : '🔄' }}</span>
        刷新
      </button>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-icon">👤</div>
        <div class="stat-value">{{ accounts.length }}</div>
        <div class="stat-label">账户总数</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">🔴</div>
        <div class="stat-value">{{ oracleAccounts.length }}</div>
        <div class="stat-label">Oracle 账户</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">🟠</div>
        <div class="stat-value">{{ awsAccounts.length }}</div>
        <div class="stat-label">AWS 账户</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">💻</div>
        <div class="stat-value">{{ allInstances.length }}</div>
        <div class="stat-label">实例总数</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon" style="color:var(--green)">✅</div>
        <div class="stat-value" style="color:var(--green)">{{ runningCount }}</div>
        <div class="stat-label">运行中</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon" style="color:var(--yellow)">⏳</div>
        <div class="stat-value" style="color:var(--yellow)">{{ pendingTasks }}</div>
        <div class="stat-label">进行中任务</div>
      </div>
    </div>

    <!-- Per-account instance overview -->
    <div v-if="accountOverviews.length > 0">
      <h2 style="font-size:15px;font-weight:600;margin-bottom:14px;color:var(--text-secondary)">账户实例概览</h2>
      <div class="instances-grid">
        <div v-for="ov in accountOverviews" :key="ov.account.id" class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:8px">
              <span>{{ ov.account.computeProvider === 'oracle' ? '🔴' : '🟠' }}</span>
              <span style="font-weight:600;font-size:14px">{{ ov.account.name }}</span>
            </div>
            <span :class="['badge', `badge-${ov.account.computeProvider}`]">{{ ov.account.computeProvider?.toUpperCase()
              }}</span>
          </div>
          <div v-if="ov.loading" class="empty-state" style="padding:20px">
            <div class="spinner"></div>
          </div>
          <div v-else-if="ov.error" style="color:var(--red);font-size:12px">{{ ov.error }}</div>
          <div v-else-if="ov.instances.length === 0"
            style="color:var(--text-muted);font-size:12px;text-align:center;padding:12px">
            暂无实例
          </div>
          <div v-else>
            <div v-for="ins in ov.instances" :key="ins.id"
              style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-size:13px;font-weight:500">{{ ins.displayName || ins.id?.slice(-8) }}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                  {{ ins.shape }}
                </div>
                <div v-if="ins.publicIp || (ins.publicIps && ins.publicIps.length)" style="margin-top:3px">
                  <span class="ip-tag">{{ ins.publicIp || ins.publicIps?.[0] }}</span>
                </div>
              </div>
              <span :class="['badge', stateClass(ins.state)]">{{ stateLabel(ins.state) }}</span>
            </div>
          </div>
          <div style="margin-top:10px;font-size:11px;color:var(--text-muted)">
            {{ ov.instances.length }} 个实例 · {{(ov.instances.filter(i => i.state === 'RUNNING' || i.state ===
              'running').length) }} 运行中
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && accounts.length === 0" class="card" style="text-align:center;padding:48px">
      <div style="font-size:48px;margin-bottom:16px">🚀</div>
      <div style="font-size:16px;font-weight:600;margin-bottom:8px">欢迎使用云管理平台</div>
      <div style="color:var(--text-muted);margin-bottom:20px">请先添加您的 Oracle 或 AWS 账户开始使用</div>
      <router-link to="/accounts" class="btn btn-primary">添加账户</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { accountsApi, cloudApi, tasksApi } from '../api/index.js'

const accounts = ref([])
const accountOverviews = ref([])
const pendingTasks = ref(0)
const loading = ref(false)

const oracleAccounts = computed(() => accounts.value.filter(a => a.computeProvider === 'oracle'))
const awsAccounts = computed(() => accounts.value.filter(a => a.computeProvider === 'aws'))
const allInstances = computed(() => accountOverviews.value.flatMap(o => o.instances))
const runningCount = computed(() => allInstances.value.filter(i => ['RUNNING', 'running'].includes(i.state)).length)

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    const [acctRes, taskRes] = await Promise.all([
      accountsApi.list(),
      tasksApi.list({ status: 'running' })
    ])
    accounts.value = acctRes.data
    pendingTasks.value = taskRes.data.length

    // Load instances per account concurrently
    accountOverviews.value = accounts.value.map(a => ({ account: a, instances: [], loading: true, error: null }))

    accounts.value.forEach(async (account, i) => {
      try {
        if (!['oracle', 'aws'].includes(account.computeProvider)) {
          accountOverviews.value[i].loading = false
          return
        }
        const r = await cloudApi.listInstances(account.id)
        accountOverviews.value[i].instances = r.data
      } catch (e) {
        accountOverviews.value[i].error = e.response?.data?.error || e.message
      } finally {
        accountOverviews.value[i].loading = false
      }
    })
  } catch (e) {
    window.$toast?.('加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

function stateClass(state) {
  if (!state) return ''
  const s = state.toLowerCase()
  if (s === 'running') return 'badge-running'
  if (['stopped', 'terminated', 'stopping'].includes(s)) return 'badge-stopped'
  return 'badge-pending'
}

function stateLabel(state) {
  if (!state) return '未知'
  const map = {
    RUNNING: '运行中', running: '运行中',
    STOPPED: '已停止', stopped: '已停止',
    STOPPING: '停止中', stopping: '停止中',
    STARTING: '启动中', pending: '启动中',
    PROVISIONING: '配置中',
    TERMINATED: '已终止', terminated: '已终止',
    TERMINATING: '终止中',
    REBOOTING: '重启中',
    SOFTRESET: '软重启'
  }
  return map[state] || state
}
</script>
