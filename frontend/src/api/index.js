import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Compute Accounts ─────────────────────────────────────
export const accountsApi = {
  list:         ()          => api.get('/accounts'),
  create:       (data)      => api.post('/accounts', data),
  update:       (id, data)  => api.put(`/accounts/${id}`, data),
  delete:       (id)        => api.delete(`/accounts/${id}`),
  test:         (id)        => api.post(`/accounts/${id}/test`),
  listDns:      ()          => api.get('/accounts/dns'),
  createDns:    (data)      => api.post('/accounts/dns', data),
  updateDns:    (id, data)  => api.put(`/accounts/dns/${id}`, data),
  deleteDns:    (id)        => api.delete(`/accounts/dns/${id}`),
  testDns:      (id)        => api.post(`/accounts/dns/${id}/test`),
}

// ── Unified Cloud (Compute) ───────────────────────────────
export const cloudApi = {
  listInstances:    (accountId)                 => api.get(`/cloud/${accountId}/instances`),
  getInstance:      (accountId, instanceId)     => api.get(`/cloud/${accountId}/instances/${instanceId}`),
  createInstance:   (accountId, data)           => api.post(`/cloud/${accountId}/instances`, data),
  instanceAction:   (accountId, instanceId, action) =>
                      api.post(`/cloud/${accountId}/instances/${instanceId}/action`, { action }),
  deleteInstance:   (accountId, instanceId)     => api.delete(`/cloud/${accountId}/instances/${instanceId}`),
  switchIp:         (accountId, instanceId, data) =>
                      api.post(`/cloud/${accountId}/instances/${instanceId}/switch-ip`, data),
  addIpv6:          (accountId, instanceId)     => api.post(`/cloud/${accountId}/instances/${instanceId}/add-ipv6`),
  // AWS-specific
  listElasticIps:   (accountId)                 => api.get(`/cloud/${accountId}/elastic-ips`),
  releaseUnused:    (accountId)                 => api.post(`/cloud/${accountId}/elastic-ips/release-unused`),
  capabilities:     (accountId)                 => api.get(`/cloud/${accountId}/capabilities`),

  // Advanced / Legacy equivalents
  modifyShape:      (accountId, instanceId, data)=> api.put(`/cloud/${accountId}/instances/${instanceId}/shape`, data),
  allowAllFirewall: (accountId, instanceId)     => api.post(`/cloud/${accountId}/instances/${instanceId}/firewall/allow-all`),
  listVolumes:      (accountId)                 => api.get(`/cloud/${accountId}/volumes`),
  deleteVolume:     (accountId, volumeId)       => api.delete(`/cloud/${accountId}/volumes/${volumeId}`),
  setupNetwork:     (accountId)                 => api.post(`/cloud/${accountId}/network/setup`),
}

// ── Unified DNS ───────────────────────────────────────────
export const dnsApi = {
  listRecords:  (dnsAccountId, filters)       => api.get(`/dns/${dnsAccountId}/records`, { params: filters }),
  upsertRecord: (dnsAccountId, data)          => api.post(`/dns/${dnsAccountId}/records`, data),
  deleteRecord: (dnsAccountId, data)          => api.delete(`/dns/${dnsAccountId}/records`, { data }),
}

// ── Tasks ─────────────────────────────────────────────────
export const tasksApi = {
  list:   (params) => api.get('/tasks', { params }),
  cancel: (id)     => api.delete(`/tasks/${id}`),
}

// ── Settings ──────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings'),
  updateTelegram: (data) => api.put('/settings/telegram', data),
}

// ── Providers meta ────────────────────────────────────────
export const providersApi = {
  list: () => api.get('/providers'),
}
