/**
 * tail-ask · DSH 适配器
 *
 * 只做一件事：把 rules/tail-ask.md 注入 DSH 的 systemPrompt。
 * 规则本体不在这个文件里——它在那份平台无关的 Markdown 里。
 * 这样别的 agent 用同一份规则，只是换一个薄壳。
 *
 * 为什么不用硬钩子（agent/turn-stopping）：
 *   插件是确定性代码，判断不了「这一轮该不该问」；
 *   硬追问会退化成每轮都问。用户要的是模型自己判断，
 *   这只能是提示词级约束（软约束），不是机制级强制。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'tail-ask'
export const inject = ['systemPrompt']

const HERE = dirname(fileURLToPath(import.meta.url))
const RULES_PATH = join(HERE, '..', 'rules', 'tail-ask.md')

let cache = null

function readRules() {
  if (cache === null) cache = readFileSync(RULES_PATH, 'utf8')
  return cache
}

export function apply(ctx, config) {
  const { enabled = true, order = 170 } = config ?? {}
  if (!enabled) return

  let text
  try {
    text = readRules()
  } catch (err) {
    // 读不到规则就说明安装损坏了。宁可报错让人看见，也不要静默装个哑插件。
    console.error(`[tail-ask] 无法读取规则文件 ${RULES_PATH}: ${err.message}`)
    throw err
  }

  if (!text.trim()) {
    console.error(`[tail-ask] 规则文件是空的 ${RULES_PATH}`)
    return
  }

  ctx.systemPrompt.section({
    name: 'tail-ask:guidance',
    order,
    text,
  })
}
