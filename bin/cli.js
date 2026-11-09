#!/usr/bin/env node
/**
 * tail-ask CLI
 *
 * 把平台无关的规则文件装到不同 agent 的规则位置。
 * 每个目标都是幂等的：重复执行不会写两遍，remove 只删自己那段。
 *
 *   tail-ask init                     # 默认写 AGENTS.md
 *   tail-ask init claude              # 写 CLAUDE.md
 *   tail-ask init cursor              # 写 .cursor/rules/tail-ask.mdc
 *   tail-ask init --dir ../my-project # 指定项目目录
 *   tail-ask remove [target]
 *   tail-ask print                    # 只打印规则全文，不动文件
 *   tail-ask check                    # 检查各目标是否已安装
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const RULES_PATH = join(ROOT, 'rules', 'tail-ask.md')
const VERSION = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version
  } catch {
    return '0.0.0'
  }
})()

const MARK_START = '<!-- tail-ask:start'
const MARK_END = '<!-- tail-ask:end -->'

const TARGETS = {
  agents: { file: 'AGENTS.md', label: 'AGENTS.md（Codex / 通用）' },
  claude: { file: 'CLAUDE.md', label: 'CLAUDE.md（Claude Code）' },
  codex: { file: 'AGENTS.md', label: 'AGENTS.md（Codex）' },
  cursor: {
    file: '.cursor/rules/tail-ask.mdc',
    label: '.cursor/rules/tail-ask.mdc（Cursor）',
    // Cursor 只认带 frontmatter 的 .mdc 规则文件；没有这段它不会加载
    frontmatter: '---\ndescription: Tail Ask — ask at the right moment, never ask when it should not\nalwaysApply: true\n---\n',
  },
}

function readRules() {
  return readFileSync(RULES_PATH, 'utf8').trim()
}

function block(rules) {
  return `${MARK_START} v${VERSION} — 由 npx tail-ask init 生成，请勿手改这一段 -->
${rules}
${MARK_END}`
}

/** 删掉文本里已有的 tail-ask 块，返回 [干净文本, 是否删过] */
function stripBlock(text) {
  const start = text.indexOf(MARK_START)
  if (start === -1) return [text, false]
  const end = text.indexOf(MARK_END, start)
  if (end === -1) return [text, false]
  const after = end + MARK_END.length
  return [(text.slice(0, start) + text.slice(after)).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', true]
}

function writeTarget(target, cwd) {
  const spec = TARGETS[target]
  if (!spec) throw new Error(`未知目标 "${target}"，可选：${Object.keys(TARGETS).join(', ')}`)
  const file = join(cwd, spec.file)
  mkdirSync(dirname(file), { recursive: true })

  let existing = ''
  if (existsSync(file)) existing = readFileSync(file, 'utf8')
  const [clean, removed] = stripBlock(existing)

  let next = clean.trim() ? `${clean.trimEnd()}\n\n${block(readRules())}\n` : `${block(readRules())}\n`
  if (spec.frontmatter && !next.startsWith('---')) next = `${spec.frontmatter}\n${next}`
  writeFileSync(file, next, 'utf8')
  return { file, removed, created: !existing }
}

function removeTarget(target, cwd) {
  const spec = TARGETS[target]
  if (!spec) throw new Error(`未知目标 "${target}"，可选：${Object.keys(TARGETS).join(', ')}`)
  const file = join(cwd, spec.file)
  if (!existsSync(file)) return { file, ok: true, note: '文件不存在，无需处理' }

  const text = readFileSync(file, 'utf8')
  const [clean, removed] = stripBlock(text)
  if (!removed) return { file, ok: true, note: '没有找到 tail-ask 段落' }

  const rest = clean.trim()
  if (!rest || (spec.frontmatter && rest === spec.frontmatter.trim())) {
    rmSync(file)
    return { file, ok: true, note: '删除该文件（原本只有 tail-ask 内容）' }
  }
  writeFileSync(file, clean, 'utf8')
  return { file, ok: true, note: '已移除 tail-ask 段落' }
}

function checkTargets(cwd) {
  const out = []
  for (const [key, spec] of Object.entries(TARGETS)) {
    const file = join(cwd, spec.file)
    if (!existsSync(file)) {
      out.push({ target: key, file, installed: false })
      continue
    }
    const text = readFileSync(file, 'utf8')
    out.push({ target: key, file, installed: text.includes(MARK_START) })
  }
  return out
}

function parseArgs(argv) {
  const args = { _: [], dir: process.cwd() }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dir' || a === '-d') args.dir = resolve(argv[++i] ?? args.dir)
    else if (a === '--help' || a === '-h') args._.push('help')
    else if (a.startsWith('-')) throw new Error(`未知参数 ${a}`)
    else args._.push(a)
  }
  return args
}

function usage() {
  console.log(`tail-ask v${VERSION}

用法:
  tail-ask init [target] [--dir <项目目录>]    把规则装进项目
  tail-ask remove [target] [--dir <项目目录>]  只删除 tail-ask 自己那段
  tail-ask check [--dir <项目目录>]            看各目标装了没有
  tail-ask print                              打印规则全文

target（默认 agents）:
  agents   AGENTS.md                 Codex / 通用
  claude   CLAUDE.md                 Claude Code
  codex    AGENTS.md                 Codex
  cursor   .cursor/rules/tail-ask.mdc  Cursor

DSH 用户不需要这个命令，直接 \`dsh plugin --profile desktop add tail-ask\`。`)
}

function main() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (err) {
    console.error(err.message)
    usage()
    process.exit(1)
  }

  const cmd = args._[0] ?? 'help'
  const target = args._[1] ?? 'agents'

  try {
    if (cmd === 'print') {
      console.log(readRules())
      return
    }
    if (cmd === 'help') {
      usage()
      return
    }
    if (cmd === 'init') {
      const r = writeTarget(target, args.dir)
      console.log(`[tail-ask] ${r.created ? '已创建' : '已更新'} ${r.file}`)
      if (r.removed) console.log('[tail-ask] 替换了旧的 tail-ask 段落')
      console.log(`[tail-ask] 规则版本 v${VERSION}`)
      return
    }
    if (cmd === 'remove') {
      const r = removeTarget(target, args.dir)
      console.log(`[tail-ask] ${r.file}: ${r.note}`)
      return
    }
    if (cmd === 'check') {
      const rows = checkTargets(args.dir)
      const hit = rows.filter((r) => r.installed)
      for (const r of rows) {
        console.log(`${r.installed ? '[✓]' : '[ ]'} ${r.target.padEnd(7)} ${r.file}`)
      }
      console.log(hit.length ? `\n共 ${hit.length} 个目标已安装。` : '\n没有目标安装。运行 tail-ask init 试试。')
      return
    }
    console.error(`未知命令 "${cmd}"`)
    usage()
    process.exit(1)
  } catch (err) {
    console.error(`[tail-ask] 失败: ${err.message}`)
    process.exit(1)
  }
}

main()
