import { Router } from 'express'
import { accountsDb, dnsAccountsDb } from '../db.mjs'
import { getComputeProvider, getDnsProvider } from '../providers/registry.mjs'
import { createTask } from '../queue.mjs'
import { validateOracleInstancePassword } from '../utils/oraclePassword.mjs'

const router = Router({ mergeParams: true })

function requireAccount(id) {
  const account = accountsDb.data.accounts.find((item) => item.id === id && item.enabled !== false)
  if (!account) {
    throw new Error(`计算账户不存在: ${id}`)
  }
  return account
}

router.get('/instances', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)
    res.json(await provider.listInstances())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/instances/:instanceId', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)
    res.json(await provider.getInstance(req.params.instanceId))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/capabilities', (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const ProviderClass = getComputeProvider(account).constructor
    res.json({ provider: account.computeProvider, capabilities: ProviderClass.capabilities || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/instances', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const { delay = 60, ...params } = req.body

    if (account.computeProvider === 'oracle') {
      validateOracleInstancePassword(params.rootPassword)
    }

    const task = await createTask('cloud:createInstance', account.id, {
      ...params,
      delay,
      provider: account.computeProvider
    })

    res.status(202).json({ taskId: task.id, message: '创建任务已加入队列' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/instances/:instanceId/action', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)
    const { action = 'START' } = req.body
    res.json({ success: true, ...(await provider.instanceAction(req.params.instanceId, action)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/instances/:instanceId', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)
    res.json({ success: true, ...(await provider.deleteInstance(req.params.instanceId)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/instances/:instanceId/switch-ip', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)
    const providerCapabilities = provider.constructor.capabilities || []

    if (!providerCapabilities.includes('switch_ip') && !providerCapabilities.includes('elastic_ip')) {
      return res.status(400).json({ error: `${account.computeProvider} 不支持切换 IP` })
    }

    const result = await provider.switchPublicIp(req.params.instanceId)
    const { dnsAccountId, dnsRecord } = req.body

    if (dnsAccountId && dnsRecord) {
      const dnsAccount = dnsAccountsDb.data.dnsAccounts.find((item) => item.id === dnsAccountId)
      if (dnsAccount) {
        const dnsProvider = getDnsProvider(dnsAccount)
        await dnsProvider.upsertRecord(dnsRecord, result.newIp, 'A')
      }
    }

    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/instances/:instanceId/add-ipv6', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)

    if (!(provider.constructor.capabilities || []).includes('ipv6')) {
      return res.status(400).json({ error: `${account.computeProvider} 不支持 IPv6` })
    }

    res.json({ success: true, ...(await provider.addIpv6(req.params.instanceId)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/elastic-ips', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)

    if (typeof provider.listElasticIps !== 'function') {
      return res.status(400).json({ error: '当前云账户不支持弹性 IP 查询' })
    }

    res.json(await provider.listElasticIps())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/elastic-ips/release-unused', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)

    if (typeof provider.releaseUnusedElasticIps !== 'function') {
      return res.status(400).json({ error: '当前云账户不支持释放空闲弹性 IP' })
    }

    const results = await provider.releaseUnusedElasticIps()
    res.json({ released: results.filter((item) => item.success).length, results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/instances/:instanceId/shape', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)

    if (!(provider.constructor.capabilities || []).includes('modify_config')) {
      return res.status(400).json({ error: `${account.computeProvider} 不支持修改配置` })
    }

    res.json({ success: true, ...(await provider.modifyInstanceConfig(req.params.instanceId, req.body)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/instances/:instanceId/firewall/allow-all', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)
    res.json({ success: true, ...(await provider.allowAllInboundTraffic(req.params.instanceId)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/volumes', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)

    if (!(provider.constructor.capabilities || []).includes('list_boot_volumes')) {
      return res.status(400).json({ error: `${account.computeProvider} 不支持管理引导卷` })
    }

    res.json(await provider.listBootVolumes())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/volumes/:volumeId', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)
    res.json({ success: true, ...(await provider.deleteBootVolume(req.params.volumeId)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/network/setup', async (req, res) => {
  try {
    const account = requireAccount(req.params.accountId)
    const provider = getComputeProvider(account)

    if (typeof provider.createNetwork !== 'function') {
      return res.status(400).json({ error: `${account.computeProvider} 不支持自动创建网络` })
    }

    res.json({ success: true, ...(await provider.createNetwork()) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
