/**
 * BaseDnsProvider - 所有 DNS Provider 的抽象基类
 */
export default class BaseDnsProvider {
  constructor(dnsAccount) {
    this.dnsAccount = dnsAccount
    if (new.target === BaseDnsProvider) {
      throw new Error('BaseDnsProvider 是抽象类，不能直接实例化')
    }
  }

  /**
   * 创建或更新 DNS 记录（upsert 语义）
   * @param {string} name - 记录名称（如 example.frp.gs）
   * @param {string} content - 记录值（如 1.2.3.4）
   * @param {string} type - 记录类型（A|AAAA|CNAME|TXT）
   * @param {object} options - { proxied, ttl }
   */
  async upsertRecord(name, content, type = 'A', options = {}) {
    throw new Error('upsertRecord() 未实现')
  }

  /**
   * 删除 DNS 记录
   * @param {string} name - 记录名称
   * @param {string} type - 记录类型
   */
  async deleteRecord(name, type = 'A') {
    throw new Error('deleteRecord() 未实现')
  }

  /**
   * 列出 DNS 记录
   * @param {object} filters - { name, type }
   * @returns {Promise<Array<NormalizedDnsRecord>>}
   */
  async listRecords(filters = {}) {
    throw new Error('listRecords() 未实现')
  }

  static providerName = 'base'
}

/**
 * @typedef {Object} NormalizedDnsRecord
 * @property {string} id
 * @property {string} name
 * @property {string} content
 * @property {string} type
 * @property {number} ttl
 * @property {boolean} proxied
 */
