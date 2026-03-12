import TelegramBot from 'node-telegram-bot-api'
import { queueEmitter } from '../queue.mjs'
import { accountsDb, settingsDb } from '../db.mjs'

let botInstance = null
let currentToken = null

function getTelegramConfig() {
  const telegram = settingsDb.data?.telegram || {}
  return {
    botToken: telegram.botToken?.trim(),
    chatId: telegram.chatId?.trim()
  }
}

function getBot(botToken) {
  if (!botToken) return null

  if (!botInstance || currentToken !== botToken) {
    botInstance = new TelegramBot(botToken, { polling: false })
    currentToken = botToken
  }

  return botInstance
}

function getAccountName(accountId) {
  if (!accountId) return '-'
  const account = accountsDb.data.accounts.find(item => item.id === accountId)
  return account?.name || accountId
}

function formatTaskMessage(task) {
  const statusLabel = task.status === 'done' ? 'DONE' : 'CANCELLED'
  const lines = [
    `Task ${statusLabel}`,
    `Type: ${task.type}`,
    `Account: ${getAccountName(task.accountId)}`,
    `Status: ${task.status}`
  ]

  if (task.statusMessage) lines.push(`Message: ${task.statusMessage}`)
  if (task.result?.instanceId) lines.push(`Instance: ${task.result.instanceId}`)
  if (task.error) lines.push(`Error: ${task.error}`)

  return lines.join('\n')
}

async function sendTaskNotification(task) {
  const { botToken, chatId } = getTelegramConfig()
  if (!botToken || !chatId) return

  const bot = getBot(botToken)
  if (!bot) return

  await bot.sendMessage(chatId, formatTaskMessage(task))
}

queueEmitter.on('task:finalized', async ({ task }) => {
  try {
    await sendTaskNotification(task)
  } catch (err) {
    console.error('Telegram notification failed:', err.message)
  }
})
