import BaseDnsProvider from './BaseDnsProvider.mjs'

/**
 * 阿里云 DNS Provider
 * 依赖：@alicloud/alidns20150109
 * 安装：npm install @alicloud/alidns20150109 @alicloud/openapi-client
 * 
 * 目前为框架实现，安装依赖后取消注释即可使用。
 */
export default class AliyunProvider extends BaseDnsProvider {
  static providerName = 'aliyun'

  constructor(dnsAccount) {
    super(dnsAccount)
    const { accessKeyId, accessKeySecret, domainName } = dnsAccount.credentials || {}
    if (!accessKeyId || !accessKeySecret) throw new Error('阿里云 DNS 缺少 accessKeyId 或 accessKeySecret')
    this.accessKeyId = accessKeyId
    this.accessKeySecret = accessKeySecret
    this.domainName = domainName  // 主域名，如 frp.gs
  }

  _getClient() {
    // 懒加载：仅在调用时才 require，避免未安装依赖时报错
    // 安装依赖后取消以下注释：
    // const Alidns = require('@alicloud/alidns20150109')
    // const OpenApi = require('@alicloud/openapi-client')
    // const config = new OpenApi.Config({ accessKeyId: this.accessKeyId, accessKeySecret: this.accessKeySecret })
    // config.endpoint = 'alidns.aliyuncs.com'
    // return new Alidns.default(config)
    throw new Error('阿里云 DNS 需要先安装依赖：npm install @alicloud/alidns20150109 @alicloud/openapi-client')
  }

  _extractSubdomain(fullName) {
    if (!this.domainName) throw new Error('请在账户凭证中设置 domainName（主域名）')
    const rr = fullName.endsWith('.' + this.domainName)
      ? fullName.slice(0, -(this.domainName.length + 1))
      : fullName
    return rr || '@'
  }

  async listRecords(filters = {}) {
    const client = this._getClient()
    // const req = new Alidns.DescribeDomainRecordsRequest({ DomainName: this.domainName, ...filters })
    // const res = await client.describeDomainRecords(req)
    // return res.body.DomainRecords.Record.map(r => ({
    //   id: r.RecordId, name: r.RR + '.' + this.domainName,
    //   content: r.Value, type: r.Type, ttl: r.TTL, proxied: false
    // }))
    throw new Error('未实现')
  }

  async upsertRecord(name, content, type = 'A', options = {}) {
    const client = this._getClient()
    const rr = this._extractSubdomain(name)
    // TODO: 先查询是否存在，存在则 update，不存在则 add
    throw new Error('请安装阿里云 DNS SDK 后实现')
  }

  async deleteRecord(name, type = 'A') {
    const client = this._getClient()
    const rr = this._extractSubdomain(name)
    // TODO: 先查询 RecordId，再调用 deleteDomainRecord
    throw new Error('请安装阿里云 DNS SDK 后实现')
  }
}
