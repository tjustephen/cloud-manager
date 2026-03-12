import { Router } from 'express'
import { dnsAccountsDb } from '../db.mjs'
import { getDnsProvider } from '../providers/registry.mjs'

const router = Router({ mergeParams: true })

function requireDnsAccount(id) {
  const account = dnsAccountsDb.data.dnsAccounts.find(a => a.id === id && a.enabled !== false)
  if (!account) throw new Error('DNS 账户不存在: ' + id)
  return account
}

// GET /api/dns/:dnsAccountId/records
router.get('/records', async (req, res) => {
  try {
    const account = requireDnsAccount(req.params.dnsAccountId)
    const provider = getDnsProvider(account)
    const records = await provider.listRecords(req.query)
    res.json(records)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/dns/:dnsAccountId/records
// body: { name, content, type?, options? }
router.post('/records', async (req, res) => {
  try {
    const account = requireDnsAccount(req.params.dnsAccountId)
    const provider = getDnsProvider(account)
    const { name, content, type = 'A', options = {} } = req.body
    if (!name || !content) return res.status(400).json({ error: 'name 和 content 为必填项' })

    const result = await provider.upsertRecord(name, content, type, options)
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/dns/:dnsAccountId/records
// body: { name, type? }
router.delete('/records', async (req, res) => {
  try {
    const account = requireDnsAccount(req.params.dnsAccountId)
    const provider = getDnsProvider(account)
    const { name, type = 'A' } = req.body
    if (!name) return res.status(400).json({ error: 'name 为必填项' })

    const result = await provider.deleteRecord(name, type)
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
