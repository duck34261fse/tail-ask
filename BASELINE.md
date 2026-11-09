# BASELINE — 提示词型插件的通用基准

> 给「只往提示层塞一段规则」的插件立一个基准。tail-ask 是第一个照它做的，但不是唯一能用的。
> 适用对象：任何 agent 生态里的 prompt-only 插件（不注册工具、不碰事件、不读写业务文件）。

---

## 1. 先判断：你的插件该不该是提示词型的

命中以下任意一条，就**不该**做成提示词插件：

- 需要**确定性**行为（每次都执行、顺序不能变）→ 用事件钩子，别用提示词
- 需要**读取文件 / 联网 / 调服务** → 那是正经工具插件
- 需要**拦截或改写**模型输出 → 用流式钩子
- 需要**用户看得见的界面** → 客户端插件

只约束「模型的行为倾向」（该不该问、先给结论再给证据、别用某个词），才是提示词插件的地盘。**硬塞**进提示词会让它退化成一句没人看的口号。

---

## 2. 目录结构（最小）

```
your-plugin/
├── rules/your-plugin.md      # 规则内核，平台无关，唯一真源
├── lib/index.js              # 适配器：只负责把规则送进提示层
├── bin/cli.js                # 可选：把规则装到别的平台
├── cordis.patch.yml          # DSH 专用：自插入 profile
├── package.json
├── README.md
├── BASELINE.md               # 这份
└── LICENSE
```

**关键分界线**：规则文本在 `rules/`，不在代码里。改规则不该碰代码，改代码不该碰规则。

---

## 3. package.json 必填项

```json
{
  "name": "your-plugin",
  "version": "1.0.0",
  "type": "module",
  "main": "./lib/index.js",
  "exports": { ".": "./lib/index.js", "./rules": "./rules/your-plugin.md" },
  "bin": { "your-plugin": "./bin/cli.js" },
  "files": ["lib", "bin", "rules", "cordis.patch.yml", "README.md", "BASELINE.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "license": "MIT",
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

- `files` 白名单**必须写**，否则 `npm pack` 会把你 `.git`、测试产物、本地笔记全打进去。
- `private: true` 只在本地开发用，发布前必须去掉。
- `exports` 里给 `./rules` 一条，别人才能直接 import 规则文本。

---

## 4. DSH 适配器的写法

```js
export const name = 'your-plugin'          // 插件名，用于日志/冲突排查
export const inject = ['systemPrompt']     // 只声明真正用到的服务

export function apply(ctx, config) {
  ctx.systemPrompt.section({ name: 'your-plugin:guidance', order: 170, text })
}
```

三条硬规矩：

1. **`inject` 只写真正用到的服务。** 漏声明会让 DSH 抛 `cannot get property "x" without inject`；多声明会让插件在服务未就绪时被挂起。
2. **`order` 要可配。** 提示段之间会打架，默认 170 只是起点，README 里要写明怎么改。
3. **读不到规则文件要报错。** 静默跳过 = 装了个哑插件，用户以为生效了其实没有。这是最难查的一类故障。

---

## 5. cordis.patch.yml：让插件自己插进去

```yaml
# 注释必须用 #，不能用 //（YAML 不是 JS）
- insert:
    - id: your-plugin
      name: your-plugin
```

- 用 `#` 注释。写成 `//` 会在加载时报 `YAMLException: end of the stream or a document separator is expected`，**而且报错信息里带的是文件路径不是行号**，很容易看漏。
- 有了这个文件，用户装完不需要手工改 profile 配置。
- 不要在用户的 `cordis.patch.yml` 里再手工 `insert` 同一个 id，重复会让 cordis 报重复条目。

---

## 6. 跨平台适配（这是 tail-ask 的额外目标）

如果想让「任何 agent 装了都获得同样能力」，规则必须**不含任何平台 API**，载体差异靠降级处理：

| 平台 | 规则落地位置 | 提问载体 |
|---|---|---|
| DSH | 插件注入 systemPrompt | 结构化卡片（`ask_user_question`） |
| Claude Code | `CLAUDE.md` | `AskUserQuestion` |
| Codex | `AGENTS.md` | 编号列表 |
| Cursor | `.cursor/rules/*.mdc` | 编号列表 |
| 纯 API | 拼进 system prompt | 编号列表 |

**降级顺序必须写进规则本身**，否则模型在没有工具的平台上会假装有工具，或者干脆不问。

---

## 7. 自测清单（发布前逐条过）

- [ ] `node --check lib/index.js` 与 `node --check bin/cli.js` 通过
- [ ] mock ctx 调用 `apply()`，确认注入段数、段名、文本长度符合预期
- [ ] `enabled: false` 时零注入
- [ ] CLI：`init` 两次只产生一份（幂等）；`check` 状态正确；`remove` 后文件干净
- [ ] `npm pack` 后解开 tarball，确认只有白名单内的文件、能被 import
- [ ] 真实环境装一次，重启后确认规则出现在系统提示里
- [ ] README 里写了「未验证的部分」

---

## 8. 发布前最容易翻车的三件事

1. **YAML 注释用 `//`** —— 插件装不上，报错还指向文件路径不指向行。
2. **`files` 白名单漏了 `rules/`** —— 本地能跑，别人装完规则文件不存在，插件直接报错。
3. **README 声称验证过的平台其实没测** —— 用户踩坑后不再信任这个仓库。边界要写清。

---

MIT
