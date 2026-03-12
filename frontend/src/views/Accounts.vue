<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>账户管理</h1>
        <p>管理计算账户（Oracle、AWS）和 DNS 账户（Cloudflare、阿里云）</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" @click="openAddDns">+ DNS 账户</button>
        <button class="btn btn-primary" @click="openAdd">+ 计算账户</button>
      </div>
    </div>

    <!-- 计算账户 -->
    <h2 class="section-title">☁️ 计算账户</h2>
    <div v-if="accounts.length === 0" class="card empty-state" style="margin-bottom:20px">
      <div class="empty-icon">🖥️</div><p>暂无计算账户</p>
    </div>
    <div v-else class="card table-wrap" style="margin-bottom:20px">
      <table>
        <thead><tr><th>账户名</th><th>Provider</th><th>凭证摘要</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="a in accounts" :key="a.id">
            <td><span style="font-weight:500">{{ a.name }}</span></td>
            <td><span :class="['badge', providerBadge(a.computeProvider)]">{{ a.computeProvider?.toUpperCase() }}</span></td>
            <td style="font-size:11px;color:var(--text-muted)">
              <span v-if="a.computeProvider==='oracle'">配置已保存 · {{ a.credentials?.configText ? '✅' : '❌' }}</span>
              <span v-else>{{ a.credentials?.region }} · {{ maskKey(a.credentials?.accessKeyId) }}</span>
            </td>
            <td><span :class="['badge', a.enabled ? 'badge-running' : 'badge-stopped']">{{ a.enabled ? '启用' : '禁用' }}</span></td>
            <td style="font-size:11px;color:var(--text-muted)">{{ fmtDate(a.createdAt) }}</td>
            <td>
              <div class="action-row">
                <button class="btn btn-ghost btn-sm" @click="testAccount(a)" :disabled="testingId===a.id">
                  {{ testingId===a.id ? '…' : '测试' }}
                </button>
                <button class="btn btn-ghost btn-sm" @click="openEdit(a)">编辑</button>
                <button class="btn btn-danger btn-sm" @click="deleteAccount(a)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- DNS 账户 -->
    <h2 class="section-title">🌐 DNS 账户</h2>
    <div v-if="dnsAccounts.length === 0" class="card empty-state">
      <div class="empty-icon">🌐</div><p>暂无 DNS 账户</p>
    </div>
    <div v-else class="card table-wrap">
      <table>
        <thead><tr><th>账户名</th><th>Provider</th><th>凭证摘要</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="a in dnsAccounts" :key="a.id">
            <td><span style="font-weight:500">{{ a.name }}</span></td>
            <td><span class="badge badge-running">{{ a.dnsProvider?.toUpperCase() }}</span></td>
            <td style="font-size:11px;color:var(--text-muted)">
              <span v-if="a.dnsProvider==='cloudflare'">Zone: {{ a.credentials?.zoneId?.slice(0,8) }}… · Token: ***</span>
              <span v-else>{{ a.credentials?.accessKeyId ? maskKey(a.credentials.accessKeyId) : '—' }}</span>
            </td>
            <td><span :class="['badge', a.enabled ? 'badge-running' : 'badge-stopped']">{{ a.enabled ? '启用' : '禁用' }}</span></td>
            <td>
              <div class="action-row">
                <button class="btn btn-ghost btn-sm" @click="testDns(a)" :disabled="testingDnsId===a.id">{{ testingDnsId===a.id?'…':'测试' }}</button>
                <button class="btn btn-ghost btn-sm" @click="openEditDns(a)">编辑</button>
                <button class="btn btn-danger btn-sm" @click="deleteDns(a)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 计算账户 Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editTarget ? '编辑计算账户' : '添加计算账户' }}</h3>
          <button class="modal-close" @click="showModal=false">×</button>
        </div>
        <div class="form-group"><label>账户名 *</label><input v-model="form.name" class="form-control" placeholder="如：迪拜账户" /></div>
        <div class="form-group">
          <label>计算 Provider *</label>
          <select v-model="form.computeProvider" class="form-control" :disabled="!!editTarget">
            <option v-for="p in computeProviders" :key="p.key" :value="p.key">{{ p.key.toUpperCase() }}</option>
          </select>
        </div>
        <!-- Oracle -->
        <template v-if="form.computeProvider==='oracle'">
          <div class="form-group"><label>OCI Config 内容 *</label><textarea v-model="cred.configText" class="form-control" rows="4" placeholder="粘贴 .oci/config 全文内容"></textarea></div>
          <div class="form-group"><label>私钥 (oci_api_key.pem) 内容 *</label><textarea v-model="cred.privateKeyText" class="form-control" rows="4" placeholder="粘贴私钥文件全文内容"></textarea></div>
        </template>
        <!-- AWS -->
        <template v-else-if="form.computeProvider==='aws'">
          <div class="form-group"><label>Access Key ID *</label><input v-model="cred.accessKeyId" class="form-control" /></div>
          <div class="form-group"><label>Secret Access Key *</label><input v-model="cred.secretAccessKey" class="form-control" type="password" /></div>
          <div class="form-group"><label>区域 *</label><input v-model="cred.region" class="form-control" placeholder="ap-southeast-1" /></div>
        </template>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showModal=false">取消</button>
          <button class="btn btn-primary" @click="saveAccount" :disabled="saving">{{ saving?'保存中…':'保存' }}</button>
        </div>
      </div>
    </div>

    <!-- DNS 账户 Modal -->
    <div v-if="showDnsModal" class="modal-overlay" @click.self="showDnsModal=false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editDnsTarget ? '编辑 DNS 账户' : '添加 DNS 账户' }}</h3>
          <button class="modal-close" @click="showDnsModal=false">×</button>
        </div>
        <div class="form-group"><label>账户名 *</label><input v-model="dnsForm.name" class="form-control" /></div>
        <div class="form-group">
          <label>DNS Provider *</label>
          <select v-model="dnsForm.dnsProvider" class="form-control" :disabled="!!editDnsTarget">
            <option v-for="p in dnsProviders" :key="p.key" :value="p.key">{{ p.key.toUpperCase() }}</option>
          </select>
        </div>
        <!-- Cloudflare -->
        <template v-if="dnsForm.dnsProvider==='cloudflare'">
          <div class="form-group"><label>API Token *</label><input v-model="dnsCred.apiToken" class="form-control" type="password" /></div>
          <div class="form-group"><label>Zone ID *</label><input v-model="dnsCred.zoneId" class="form-control" /></div>
        </template>
        <!-- Aliyun -->
        <template v-else-if="dnsForm.dnsProvider==='aliyun'">
          <div class="form-group"><label>Access Key ID *</label><input v-model="dnsCred.accessKeyId" class="form-control" /></div>
          <div class="form-group"><label>Access Key Secret *</label><input v-model="dnsCred.accessKeySecret" class="form-control" type="password" /></div>
          <div class="form-group"><label>主域名（如 example.com）</label><input v-model="dnsCred.domainName" class="form-control" /></div>
        </template>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showDnsModal=false">取消</button>
          <button class="btn btn-primary" @click="saveDns" :disabled="savingDns">{{ savingDns?'保存中…':'保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { accountsApi, providersApi } from '../api/index.js'

const accounts = ref([])
const dnsAccounts = ref([])
const computeProviders = ref([])
const dnsProviders = ref([])
const loading = ref(false)
const saving = ref(false)
const savingDns = ref(false)
const showModal = ref(false)
const showDnsModal = ref(false)
const editTarget = ref(null)
const editDnsTarget = ref(null)
const testingId = ref(null)
const testingDnsId = ref(null)

const defForm = () => ({ name: '', computeProvider: 'oracle' })
const defDnsForm = () => ({ name: '', dnsProvider: 'cloudflare' })
const form = ref(defForm())
const cred = ref({})
const dnsForm = ref(defDnsForm())
const dnsCred = ref({})

onMounted(async () => {
  const [, provRes] = await Promise.all([load(), providersApi.list()])
  computeProviders.value = provRes.data.compute
  dnsProviders.value = provRes.data.dns
})

async function load() {
  loading.value = true
  try {
    const [aRes, dRes] = await Promise.all([accountsApi.list(), accountsApi.listDns()])
    accounts.value = aRes.data
    dnsAccounts.value = dRes.data
  } catch (e) { window.$toast?.(e.message, 'error') } finally { loading.value = false }
}

function openAdd() { editTarget.value = null; form.value = defForm(); cred.value = {}; showModal.value = true }
function openEdit(a) { editTarget.value = a; form.value = { name: a.name, computeProvider: a.computeProvider }; cred.value = { ...a.credentials }; showModal.value = true }
function openAddDns() { editDnsTarget.value = null; dnsForm.value = defDnsForm(); dnsCred.value = {}; showDnsModal.value = true }
function openEditDns(a) { editDnsTarget.value = a; dnsForm.value = { name: a.name, dnsProvider: a.dnsProvider }; dnsCred.value = { ...a.credentials }; showDnsModal.value = true }

async function saveAccount() {
  if (!form.value.name) return window.$toast?.('请填写账户名', 'error')
  saving.value = true
  try {
    const payload = { ...form.value, credentials: { ...cred.value } }
    editTarget.value ? await accountsApi.update(editTarget.value.id, payload) : await accountsApi.create(payload)
    window.$toast?.('保存成功', 'success'); showModal.value = false; await load()
  } catch (e) { window.$toast?.(e.response?.data?.error || e.message, 'error') } finally { saving.value = false }
}

async function saveDns() {
  if (!dnsForm.value.name) return window.$toast?.('请填写账户名', 'error')
  savingDns.value = true
  try {
    const payload = { ...dnsForm.value, credentials: { ...dnsCred.value } }
    editDnsTarget.value ? await accountsApi.updateDns(editDnsTarget.value.id, payload) : await accountsApi.createDns(payload)
    window.$toast?.('保存成功', 'success'); showDnsModal.value = false; await load()
  } catch (e) { window.$toast?.(e.response?.data?.error || e.message, 'error') } finally { savingDns.value = false }
}

async function deleteAccount(a) {
  if (!confirm(`删除账户「${a.name}」？`)) return
  try { await accountsApi.delete(a.id); window.$toast?.('已删除', 'success'); await load() }
  catch (e) { window.$toast?.(e.response?.data?.error || e.message, 'error') }
}
async function deleteDns(a) {
  if (!confirm(`删除 DNS 账户「${a.name}」？`)) return
  try { await accountsApi.deleteDns(a.id); window.$toast?.('已删除', 'success'); await load() }
  catch (e) { window.$toast?.(e.response?.data?.error || e.message, 'error') }
}
async function testAccount(a) {
  testingId.value = a.id
  try { await accountsApi.test(a.id); window.$toast?.(`「${a.name}」连接成功 ✅`, 'success') }
  catch (e) { window.$toast?.(`连接失败: ${e.response?.data?.error || e.message}`, 'error') }
  finally { testingId.value = null }
}
async function testDns(a) {
  testingDnsId.value = a.id
  try { await accountsApi.testDns(a.id); window.$toast?.(`「${a.name}」连接成功 ✅`, 'success') }
  catch (e) { window.$toast?.(`连接失败: ${e.response?.data?.error || e.message}`, 'error') }
  finally { testingDnsId.value = null }
}

function maskKey(k) { return k ? k.slice(0,6) + '…' + k.slice(-4) : '—' }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '—' }
function providerBadge(p) { return p === 'oracle' ? 'badge-oracle' : p === 'aws' ? 'badge-aws' : 'badge-pending' }
</script>

<style scoped>
.section-title { font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:12px; }
</style>
