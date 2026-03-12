import axios from 'axios'
import BaseDnsProvider from './BaseDnsProvider.mjs'

export default class CloudflareProvider extends BaseDnsProvider {
  static providerName = 'cloudflare'

  constructor(dnsAccount) {
    super(dnsAccount)
    const { apiToken, zoneId } = dnsAccount.credentials || {}
    if (!apiToken || !zoneId) throw new Error('Cloudflare Provider 缺少 apiToken 或 zoneId')

    this.zoneId = zoneId
    this.api = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    })
  }

  async listRecords(filters = {}) {
    const params = {}
    if (filters.name) params.name = filters.name
    if (filters.type) params.type = filters.type

    const res = await this.api.get(`/zones/${this.zoneId}/dns_records`, { params })
    return res.data.result.map(r => ({
      id: r.id,
      name: r.name,
      content: r.content,
      type: r.type,
      ttl: r.ttl,
      proxied: r.proxied
    }))
  }

  async upsertRecord(name, content, type = 'A', options = {}) {
    const { proxied = false, ttl = 1 } = options

    // Check if exists
    const existing = (await this.listRecords({ name, type }))[0]

    const payload = { type, name, content, ttl, proxied }

    if (existing) {
      await this.api.put(`/zones/${this.zoneId}/dns_records/${existing.id}`, payload)
    } else {
      await this.api.post(`/zones/${this.zoneId}/dns_records`, payload)
    }

    return { name, content, type, upserted: true }
  }

  async deleteRecord(name, type = 'A') {
    const existing = (await this.listRecords({ name, type }))[0]
    if (!existing) return { deleted: false, reason: '记录不存在' }

    await this.api.delete(`/zones/${this.zoneId}/dns_records/${existing.id}`)
    return { deleted: true, id: existing.id }
  }
}
