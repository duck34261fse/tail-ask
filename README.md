# tail-ask

**让任何 AI agent 在对的时候问、错的时候别问。**

Make any AI agent ask at the right moment — and never ask when it shouldn't.

一份平台无关的规则文件 + 几个薄适配器。DSH、Claude Code、Cursor、Codex、自建 API 调用，读的都是同一份判断标准。

---

## 它解决什么

模型有两个反复出现的坏毛病，方向相反：

- **该问的不问**：信息不够就硬猜，做完才发现方向错了，返工成本比问一句高十倍。
- **不该问的乱问**：「需要我继续吗」「你看这样行不行」「你想要什么风格」—— 这些不是提问，是把判断权丢回给用户。

`tail-ask` 只做一件事：把「什么时候该问、什么时候绝对不问、问要问成什么形状、用户回答后怎么接」写成一条可检查的规则，挂到 agent 的提示层。

它不管模型的推理能力，只约束**提问行为**。

---

## 安装

先克隆：

```sh
git clone https://github.com/duck34261fse/tail-ask.git
```

下面按平台选一种，装完拿到的是同一套规则。

### DSH

把克隆下来的目录挂进 profile。

**如果你有 `dsh` 命令**（部分发行方式自带）：

```sh
dsh plugin --profile desktop add link:<克隆下来的绝对路径>
```

**如果没有 `dsh` 命令**（Electron 安装包常常没有），手工两步：

1. 打开 `%USERPROFILE%\.dsh\profiles\desktop\package.json`，在 `dependencies` 里加一行：

   ```json
   "tail-ask": "link:<克隆下来的绝对路径，正斜杠>"
   ```

2. 同一个文件往下找 `bundles` 数组（在 `dsh.bundle` 下面），加一项 `"tail-ask"`。

3. 重启 DSH。

插件的 `cordis.patch.yml` 会把自己插进层栈，不需要另外改 `cordis.patch.yml`。

**两个常见错误**：

- 写 `add tail-ask` 不带 `link:` —— DSH 会当成 npm 包名去 registry 找，本项目没上架 npm，必然失败。
- 路径用反斜杠 —— 在 JSON 里要转义，直接写成 `D:/xxx/tail-ask` 这种正斜杠最省事。

### Claude Code

```sh
node tail-ask/bin/cli.js init claude
```

规则写进项目根的 `CLAUDE.md`。重复执行不会写两遍，`remove` 只删自己那段。

### Codex / 其他读 AGENTS.md 的 agent

```sh
node tail-ask/bin/cli.js init codex     # Codex
node tail-ask/bin/cli.js init agents    # 其他只认 AGENTS.md 的 agent
```

这两个目标写的是**同一个** `AGENTS.md`，装一个等于两个都装 —— `check` 会把它们都显示为已安装，这是正常的，不是装了两份。

### Cursor

```sh
node tail-ask/bin/cli.js init cursor
```

生成 `.cursor/rules/tail-ask.mdc`。

### 纯 API 调用

规则就是一份 Markdown：[`rules/tail-ask.md`](rules/tail-ask.md)。把它拼进 system prompt 即可，不需要任何运行时依赖：

```js
import { readFileSync } from 'node:fs'

// 路径按你实际放的位置改，别用相对路径靠当前工作目录碰运气
const RULES = '/path/to/tail-ask/rules/tail-ask.md'
const rules = readFileSync(RULES, 'utf8')
const system = `${baseSystemPrompt}\n\n${rules}`
```

**成本**：规则全文约 1700 token，作为 system prompt 的一部分**每轮对话都要发一次**。常驻场景下这笔开销是持续的，觉得贵就删掉 `rules/tail-ask.md` 里你用不上的小节（比如纯 API 用不上「载体降级」那几段）。

---

## 平台对照

| 平台 | 安装方式 | 拿到的能力 |
|---|---|---|
| DSH | `dsh plugin --profile desktop add link:<路径>`，没有 dsh 命令就手工改 `package.json` | 规则注入 systemPrompt；提问可用结构化选项卡片 |
| Claude Code | `node bin/cli.js init claude` | 规则进 `CLAUDE.md`；提问可用 `AskUserQuestion` |
| Codex | `node bin/cli.js init codex` | 规则进 `AGENTS.md`；提问是编号列表 |
| Cursor | `node bin/cli.js init cursor` | 规则进 `.cursor/rules/*.mdc`；提问是编号列表 |
| 其他 agent | `node bin/cli.js init agents` | 规则进 `AGENTS.md`；提问是编号列表 |
| 纯 API | 手动拼进 system prompt | 只有规则；提问是正文里的编号列表 |

> `codex` 和 `agents` 写的是同一个 `AGENTS.md`，装一个等于两个都装。

> 本项目当前**只发布在 GitHub**，没有上架 npm，所以没有 `npx tail-ask` 这种一行安装。克隆下来直接用。

**所有平台拿到的是同一套判断标准和同一套格式要求**，差别只在「怎么把问题呈现给用户」——有结构化工具就用工具，没有就降级成编号选项，再没有就是一句话直问。降级的是载体，不是标准。

---

## 规则长什么样

完整规则在 [`rules/tail-ask.md`](rules/tail-ask.md)，核心是四块：

1. **只有两种理由可以问**：信息缺口（答案会改变下一步、自己查不到、用户回答成本低）、方向决策（影响长期结构、你已有 2–3 个候选但拿不准）。
2. **七种情况绝对不问**：自己能查的、礼节性确认、复述型提问、同一话题问过两轮、用户已明确指示的、不影响后续动作的、为了显得在听而问的。
3. **格式硬要求**：问题一句话、选项 2–4 个互斥、推荐项放第一、让用户「指一下」就完事。
4. **回答后直接消化继续**：不复述、不道谢、不为确认再问一次。

---

## 命令

在克隆下来的目录里跑：

```
node bin/cli.js init [target] [--dir <dir>]     安装到项目（默认 agents）
node bin/cli.js remove [target] [--dir <dir>]   只删除自己那段
node bin/cli.js check [--dir <dir>]             查看各目标装了没有
node bin/cli.js print                           打印规则全文
```

`target` 可选：`agents`｜`claude`｜`codex`｜`cursor`。

---

## 改规则

规则唯一的真源是 `rules/tail-ask.md`。改它，所有平台的适配器下次执行时自动拿到新内容——不需要改代码。

DSH 适配器启动时读这个文件注入；如果读不到会直接报错而不是静默装个哑插件。

---

## 能力边界（不吹）

- 这是**提示词级软约束**，不是硬机制。模型可能不遵守。
- 它不提升模型的判断力，只约束「问什么、怎么问、什么时候不问」。
- 追问密度仍是模型判断，可能偏多或偏少；觉得吵就改 `rules/tail-ask.md` 第 5 节的密度上限。
- 本仓库只在一台机器上实测了 DSH 适配器；Claude Code / Cursor 的适配文件按各平台公开的规则加载方式生成，**未在真实环境验证行为**。Issue 里欢迎反馈。

---

## 许可

MIT
