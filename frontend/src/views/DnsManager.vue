<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>DNS 管理</h1>
        <p>查看并管理当前 DNS 账户下的解析记录</p>
      </div>
    </div>

    <div class="account-selector" style="margin-bottom: 20px">
      <span v-if="loadingAccounts" style="font-size: 13px; color: var(--text-muted)">加载账户中...</span>
      <select v-else v-model="selectedDnsAccountId" class="form-control" style="max-width: 300px">
        <option value="" disabled>-- 请选择 DNS 账户 --</option>
        <option v-for="a in dnsAccounts" :key="a.id" :value="a.id">
          {{ a.name }} ({{ a.dnsProvider }})
        </option>
      </select>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:16px">新增或更新记录</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0">
          <label>记录名称</label>
          <input v-model="quickForm.recordName" class="form-control" placeholder="example.frp.gs" />
        </div>
        <div class="form-group" style="flex:1;min-width:160px;margin-bottom:0">
          <label>记录值</label>
          <input v-model="quickForm.recordContent" class="form-control" placeholder="1.2.3.4" />
        </div>
        <div class="form-group" style="min-width:100px;margin-bottom:0">
          <label>类型</label>
          <select v-model="quickForm.recordType" class="form-control">
            <option>A</option>
            <option>AAAA</option>
            <option>CNAME</option>
            <option>TXT</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="upsertRecord" :disabled="saving" style="margin-bottom:0">
          {{ saving ? '保存中...' : (editingRecord ? '更新记录' : '创建记录') }}
        </button>
        <button v-if="editingRecord" class="btn btn-ghost" @click="resetEditor" style="margin-bottom:0">
          取消编辑
        </button>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:16px">删除记录</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0">
          <label>记录名称</label>
          <input v-model="delForm.recordName" class="form-control" placeholder="要删除的记录名" />
        </div>
        <div class="form-group" style="min-width:100px;margin-bottom:0">
          <label>类型</label>
          <select v-model="delForm.recordType" class="form-control">
            <option>A</option>
            <option>AAAA</option>
            <option>CNAME</option>
            <option>TXT</option>
          </select>
        </div>
        <button class="btn btn-danger" @click="deleteRecord" :disabled="deleting">
          {{ deleting ? '删除中...' : '删除记录' }}
        </button>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="font-size:14px;font-weight:600;margin:0">已添加记录</h3>
        <button class="btn btn-ghost btn-sm" @click="loadRecords" :disabled="loadingRecords || !selectedDnsAccountId">
          {{ loadingRecords ? '加载中...' : '刷新列表' }}
        </button>
      </div>

      <div v-if="!selectedDnsAccountId" style="color:var(--text-muted);font-size:13px">
        请先选择 DNS 账户
      </div>
      <div v-else-if="loadingRecords" style="display:flex;justify-content:center;padding:20px 0">
        <div class="spinner"></div>
      </div>
      <div v-else-if="records.length === 0" style="color:var(--text-muted);font-size:13px">
        暂无解析记录
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>类型</th>
              <th>内容</th>
              <th>TTL</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in records" :key="record.id || `${record.name}-${record.type}-${record.content}`">
              <td>{{ record.name }}</td>
              <td>{{ record.type }}</td>
              <td>
                <span class="record-content" :title="record.content">{{ record.content }}</span>
              </td>
              <td>{{ record.ttl ?? '自动' }}</td>
              <td>
                <span :class="['badge', record.proxied ? 'badge-running' : 'badge-stopped']">
                  {{ record.proxied ? '代理' : '仅 DNS' }}
                </span>
              </td>
              <td>
                <div class="action-row">
                  <button class="btn btn-ghost btn-sm" @click="editRecord(record)">编辑</button>
                  <button class="btn btn-danger btn-sm" @click="deleteFromRow(record)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { accountsApi, dnsApi } from '../api/index.js'

const dnsAccounts = ref([])
const selectedDnsAccountId = ref('')
const loadingAccounts = ref(true)
const loadingRecords = ref(false)
const records = ref([])

const saving = ref(false)
const deleting = ref(false)
const editingRecord = ref(null)
const quickForm = ref({ recordName: '', recordContent: '', recordType: 'A' })
const delForm = ref({ recordName: '', recordType: 'A' })

onMounted(async () => {
  try {
    const res = await accountsApi.listDns()
    dnsAccounts.value = res.data
    if (dnsAccounts.value.length > 0) {
      selectedDnsAccountId.value = dnsAccounts.value[0].id
    }
  } catch (e) {
    window.$toast?.(`加载 DNS 账户失败: ${e.message}`, 'error')
  } finally {
    loadingAccounts.value = false
  }
})

watch(selectedDnsAccountId, async (value) => {
  resetEditor()
  if (!value) {
    records.value = []
    return
  }
  await loadRecords()
})

async function loadRecords() {
  if (!selectedDnsAccountId.value) return

  loadingRecords.value = true
  try {
    const res = await dnsApi.listRecords(selectedDnsAccountId.value)
    records.value = res.data
  } catch (e) {
    window.$toast?.(e.response?.data?.error || e.message, 'error')
  } finally {
    loadingRecords.value = false
  }
}

function resetEditor() {
  editingRecord.value = null
  quickForm.value = { recordName: '', recordContent: '', recordType: 'A' }
}

function editRecord(record) {
  editingRecord.value = record
  quickForm.value = {
    recordName: record.name,
    recordContent: record.content,
    recordType: record.type
  }
}

async function upsertRecord() {
  if (!quickForm.value.recordName || !quickForm.value.recordContent) {
    return window.$toast?.('请填写记录名称和记录值', 'error')
  }
  if (!selectedDnsAccountId.value) {
    return window.$toast?.('请先选择 DNS 账户', 'error')
  }

  saving.value = true
  try {
    await dnsApi.upsertRecord(selectedDnsAccountId.value, {
      name: quickForm.value.recordName,
      content: quickForm.value.recordContent,
      type: quickForm.value.recordType
    })
    window.$toast?.(editingRecord.value ? 'DNS 记录已更新' : 'DNS 记录已创建', 'success')
    resetEditor()
    await loadRecords()
  } catch (e) {
    window.$toast?.(e.response?.data?.error || e.message, 'error')
  } finally {
    saving.value = false
  }
}

async function removeRecord(recordName, recordType) {
  if (!selectedDnsAccountId.value) {
    return window.$toast?.('请先选择 DNS 账户', 'error')
  }
  if (!confirm(`确认删除 DNS 记录“${recordName}”？`)) {
    return
  }

  deleting.value = true
  try {
    await dnsApi.deleteRecord(selectedDnsAccountId.value, {
      name: recordName,
      type: recordType
    })
    window.$toast?.('DNS 记录已删除', 'success')
    if (editingRecord.value?.name === recordName && editingRecord.value?.type === recordType) {
      resetEditor()
    }
    if (delForm.value.recordName === recordName && delForm.value.recordType === recordType) {
      delForm.value = { recordName: '', recordType: 'A' }
    }
    await loadRecords()
  } catch (e) {
    window.$toast?.(e.response?.data?.error || e.message, 'error')
  } finally {
    deleting.value = false
  }
}

async function deleteRecord() {
  if (!delForm.value.recordName) {
    return window.$toast?.('请填写记录名称', 'error')
  }
  await removeRecord(delForm.value.recordName, delForm.value.recordType)
}

async function deleteFromRow(record) {
  await removeRecord(record.name, record.type)
}
</script>

<style scoped>
.record-content {
  display: inline-block;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  font-family: monospace;
  font-size: 12px;
}
</style>
