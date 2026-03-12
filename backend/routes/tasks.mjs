import { Router } from 'express'
import { getTasks, cancelTask, sseClients } from '../queue.mjs'

const router = Router()

// GET /api/tasks - 查询任务列表
router.get('/', (req, res) => {
  const { status, accountId, type } = req.query
  const tasks = getTasks({ status, accountId, type })
  res.json(tasks)
})

// DELETE /api/tasks/:id - 取消任务
router.delete('/:id', async (req, res) => {
  try {
    const task = await cancelTask(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    res.json(task)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tasks/stream - SSE 实时推送
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  // Send all current tasks on connect
  const tasks = getTasks()
  res.write(`data: ${JSON.stringify({ event: 'init', tasks })}\n\n`)

  sseClients.add(res)

  // Heartbeat
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n') } catch (_) {}
  }, 25000)

  req.on('close', () => {
    sseClients.delete(res)
    clearInterval(heartbeat)
  })
})

export default router
