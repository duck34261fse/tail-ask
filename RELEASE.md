# tail-ask 发布指南

> 面向个人开发者 · 仅发布在 GitHub · 目标是「验证路径可行 + 留下学习记录」
> 写成可执行的操作清单，不是原则宣传。有争议的地方直接标「视情况而定」。
> 最后更新：2026-11-09

---

## 0. 先定三件事（决定了后面所有步骤）

| 决策 | 本项目的选择 | 理由 |
|---|---|---|
| 协议 | **MIT** | 见图 1.1 |
| 分发方式 | **仅 GitHub 仓库**，不发 npm | 你定的。代价：README 的 `npx` 用法要改 |
| 自动化程度 | 只做 3 个 Actions | 单人项目，自动化超过「省下的时间」就是负债 |

**仅 GitHub 带来的直接后果**（必须改，否则 README 会骗人）：

- `npx tail-ask init` 不可用 → 改成 `git clone` 后 `node bin/cli.js init`
- 别人无法 `npm install tail-ask` → DSH 用户只能从本地路径 `dsh plugin add link:<path>`
- 没有版本号发布渠道 → 用 Git tag + Release 页面代替

---

# 一、发布前

## 1.1 协议与合规

### 三个主流协议的核心区别

| 项目 | MIT | Apache-2.0 | GPL-3.0 |
|---|---|---|---|
| 类型 | 宽松（permissive） | 宽松 + 专利条款 | 传染性（copyleft） |
| 别人能否商用 | 能 | 能 | 能，但衍生作品也必须 GPL |
| 别人改了能否闭源 | 能 | 能 | **不能** |
| 是否必须保留版权声明 | 是 | 是 | 是 |
| 专利授权 | 无明确条款 | **明确授予专利许可** | 明确授予 |
| 商标授权 | 无 | **明确不授予** | 不授予 |
| 修改文件需注明 | 不要求 | **要求标注修改过的文件** | 要求 |
| 长度/可读性 | 极短，一眼看懂 | 中等，有法律术语 | 很长 |
| 适合谁 | 想让别人随便用、自己不想管 | 有大公司背景或担心专利 | 想让衍生品保持开源 |

官方原文：
- MIT：https://opensource.org/license/mit
- Apache-2.0：https://www.apache.org/licenses/LICENSE-2.0
- GPL-3.0：https://www.gnu.org/licenses/gpl-3.0.html

### 给个人学习项目的建议

**选 MIT。** 三个理由：

1. 你写的是工具类插件，目标是「别人拿去用」，不是「防止别人抄」。
2. 你目前没有专利诉求，Apache 的专利条款对你不产生实际保护。
3. GPL 会给使用者（包括你自己以后商用）增加约束，学习项目没必要背这个。

**什么时候该改主意（视情况而定）**：

- 如果以后这个项目要并入公司产品，且公司有专利，考虑 Apache-2.0
- 如果核心价值在「不允许闭源分叉」，选 GPL-3.0
- 如果只是给自己用、暂时不想别人改，可以先用 MIT 但不开 PR（见 4.2）

### 第三方依赖合规

| 检查项 | 本项目情况 | 通用做法 |
|---|---|---|
| 运行时依赖 | **零依赖**（只用 Node 内置模块） | `npm ls --prod --depth=0` 看有没有 |
| 开发依赖 | 无 | 有的话逐个看协议 |
| 别人的代码片段 | 无 | 抄了要注明来源和协议 |
| 规则文本的版权 | 原创 | 自己写的没有第三方版权问题 |

**判据**：`package.json` 的 `dependencies` 为空 = 没有第三方合规负担。这是本项目的一个真实优势，值得写进 README。

**注意**：Node.js 本身是 MIT，不受影响；但不意味着「运行在 Node 上就不用管协议」。

## 1.2 安全与清理

### Git 历史里的密钥

**本项目现状**：还没有 git 仓库，是从零开始。所以这一步是「建立习惯」，不是「清理旧账」。

**通用规则**：密钥一旦进过 git 历史，删文件不等于删记录——`git log` 里还能翻出来。

| 场景 | 做法 |
|---|---|
| 还没 push 过 | `git commit --amend` 或 `git reset` 重来，最简单 |
| 已 push，仓库私密、没人 fork | 用 `git filter-repo` 重写历史后强推 |
| 已 push，公开且已有人 fork | **先撤销这个密钥**，再考虑清历史；清历史也追不回别人的副本 |

工具：
- `git filter-repo`：https://github.com/newren/git-filter-repo（推荐，官方 wiki 里也用它替代 filter-branch）
- BFG Repo-Cleaner：https://rtyley.github.io/bfg-repo-cleaner/
- GitHub 官方文档「Removing sensitive data from a repository」：https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

**最重要的一条**：清历史是补救，撤销密钥才是止损。顺序不能反。

### .gitignore 的编写思路

按「三类东西」写，不要凭感觉：

```gitignore
# 1. 依赖与构建产物（可以随时重装）
node_modules/
dist/
*.tgz

# 2. 本地环境与密钥（绝对不能进版本库）
.env
.env.*
*.key
*.pem
credentials.json

# 3. 编辑器与系统垃圾（纯噪音）
.vscode/
.idea/
.DS_Store
Thumbs.db
*.log
```

本项目当前的 [.gitignore](.gitignore) 已经覆盖第 1、3 类；第 2 类目前没有敏感文件，但先写上不吃亏。

**判据**：提交前跑一次 `git status`，看到任何「你不想让陌生人看到的文件名」，就说明漏了。

### 依赖漏洞检查

本项目零运行时依赖，风险极低。但方法要知道：

| 方法 | 命令/位置 | 说明 |
|---|---|---|
| 本地扫描 | `npm audit` / `pnpm audit` | 对着 lockfile 查已知漏洞 |
| GitHub 内置 | 仓库 Settings → Code security → Dependabot alerts | 免费，自动开 PR 修 |
| 第三方 | Socket.dev、Snyk | 更细，但个人项目一般不需要 |

npm audit 文档：https://docs.npmjs.com/cli/commands/npm-audit
Dependabot 文档：https://docs.github.com/en/code-security/dependabot

**提醒**：`npm audit` 报的「高危」不一定真的影响你——要看调用路径。不要因为报警就无脑升级，那会引入新问题。

## 1.3 工程规范与自动化

### Commit 规范

用 **Conventional Commits**（https://www.conventionalcommits.org/zh-hans/），格式：

```
<类型>(<范围>): <描述>

feat(cli): 支持 --dir 指定项目目录
fix(dsh): 读不到规则文件时不再静默跳过
docs: 补充 Cursor frontmatter 说明
chore: 升级版本号到 1.0.0
```

常用类型：`feat` `fix` `docs` `refactor` `test` `chore` `perf`。

**为什么值得守**：以后要生成 CHANGELOG、要看「这个功能哪版加的」，靠 commit 信息就能查。个人项目也一样，因为三个月后的你会忘记。

### 分支管理

**视情况而定**，没有唯一正确答案：

| 场景 | 建议 | 理由 |
|---|---|---|
| 单人开发，且随时能 push | **trunk-based**：只在 `main` 上提交 | 分支活在本地 = 白干；合并冲突还得自己解 |
| 单人，但有长期实验 | `main` + 一个 `experiment/xxx` 分支 | 防止半成品污染主线 |
| 2 人以上 | `main` + 每人 feature 分支 + PR | 需要 review 才需要分支 |
| 要对外发布稳定版 | 加 `release/1.x` 分支 | 修 bug 不带着新功能一起发 |

**不要为了「看起来专业」而开分支**。一个人开三个分支，最后 90% 的提交都在 `main`。

### GitHub Actions 基础配置

单人项目的合理范围是 **3 个**，多一个都是负担：

| 场景 | 触发时机 | 做什么 | 价值 |
|---|---|---|---|
| 语法检查 | push / PR | `node --check` 三个 JS 文件 | 防止低级错误进主线 |
| 打包自检 | push / PR | `npm pack` 后解开看文件清单是否只有白名单 | 防止「本地能跑、别人装了缺文件」 |
| 发 Release | 打 tag | 自动打包并附到 Release | 省手动传文件 |

文档：https://docs.github.com/en/actions

**不建议现在做的**：自动发 npm（你只发 GitHub）、E2E 测试（本项目是提示词插件，测不了行为）、代码覆盖率（没有测试就谈覆盖率是表演）。

### README 的必要模块

兼顾初学者和专业用户，按这个顺序：

| 顺序 | 模块 | 写给谁看 | 本项目是否已有 |
|---|---|---|---|
| 1 | 一句话简介（中英） | 所有人 | ✅ |
| 2 | 它解决什么问题（具体场景） | 初学者 | ✅ |
| 3 | 30 秒安装（最快跑通的方式） | 所有人 | ✅ 但需改成 clone 版 |
| 4 | 平台对照表（每个平台拿到什么） | 专业用户 | ✅ |
| 5 | 规则长什么样 / 核心机制 | 想理解的人 | ✅ |
| 6 | 命令参考 | 专业用户 | ✅ |
| 7 | 怎么改规则 | 想定制的人 | ✅ |
| 8 | **能力边界（不吹的部分）** | 所有人，**最容易漏** | ✅ |
| 9 | 许可 | 所有人 | ✅ |

**第 8 项最容易被跳过，但它是可信度的来源**。写清楚「什么没验证过」，比声称「全部通过」更让人放心。

---

# 二、发布时

## 2.1 建仓库到首次发布

```bash
cd D:/AI/dsh-plugins/tail-ask
git init
git add .
git commit -m "feat: initial release of tail-ask v1.0.0"
git branch -M main
git remote add origin https://github.com/<你的用户名>/tail-ask.git
git push -u origin main
```

第一次 push 需要认证。**不要**把 token 写进 URL 提交上去：

```bash
# 临时用（不会存进仓库），或配置 credential helper
git push https://<token>@github.com/<用户名>/tail-ask.git main
```

更好的方式：装 Git Credential Manager 或 `gh auth login`（https://cli.github.com/），让凭据存进系统凭据管理器。

## 2.2 打 tag 与 Release

```bash
git tag -a v1.0.0 -m "v1.0.0: 首个可发布版本"
git push origin v1.0.0
```

然后到 GitHub 仓库 → Releases → Draft a new release，选这个 tag，写变更说明（内容可以从 commit 里汇总）。

文档：https://docs.github.com/en/repositories/releasing-projects-on-github

**Release notes 写什么**：新增了什么、修了什么、**已知未验证的部分**（跟 README 第 8 项呼应）。

---

# 三、长期运营

## 3.1 Issue 和 PR 的处理流程

个人项目的现实是：**没人提**是常态，有人提是惊喜。流程要轻。

| 环节 | 做法 | 耗时 |
|---|---|---|
| 收到 Issue | 先判断属于哪类：bug / 功能请求 / 用法提问 | 1 分钟 |
| 打标签 | `bug` / `enhancement` / `question` / `wontfix` | 10 秒 |
| 回复 | 问清复现步骤；能一分钟修的直接说「我修了」 | 5 分钟 |
| 不回的情况 | 明显是环境问题（没读 README）→ 回链接，不展开 | 1 分钟 |
| PR | 先看是不是「改规则文本」，是就直接合；改代码要跑一次自测清单 | 10 分钟 |

**一条硬原则**：不回「在吗」「能看一下吗」这类没有信息的消息。等对方给出具体内容再回。

## 3.2 学习记录与社区互动的平衡

这两个目标会打架：**学习记录要写过程，社区要的是结论**。

| 做法 | 好处 | 代价 |
|---|---|---|
| 全部写进 README | 一处维护 | README 变长，专业用户烦 |
| 单独 `docs/devlog.md` | 主线干净，过程有处放 | 多一个文件要维护 |
| 只写 README，过程放 commit message | 零额外维护 | 过程不易检索 |

**建议**：`docs/devlog.md`，按日期记「今天踩了什么坑、怎么想通的」。理由：

1. 你自己的学习记录有地方放
2. README 保持「给用户看」的状态
3. 以后写博客、做视频有现成素材

**什么时候停止更新 devlog**：连续三个月没写新的 → 说明这个习惯不成立，合并进 README 的「变更记录」即可，别留个死文件。

---

# 四、操作检查清单

## 发布前

- [ ] 选定协议，`LICENSE` 文件已放根目录（本项目：MIT）
- [ ] `package.json` 的 `license` 字段与 LICENSE 一致
- [ ] 确认无运行时依赖，或已逐个核对依赖协议
- [ ] `.gitignore` 覆盖「依赖 / 密钥 / 垃圾」三类
- [ ] `git status` 里没有任何敏感文件名
- [ ] README 包含第 8 项「能力边界」，且写清哪些没验证
- [ ] README 的安装方式与实际分发渠道一致（**仅 GitHub → 不能写 npx**）
- [ ] `npm pack` 后检查文件清单只有白名单
- [ ] 解开 tarball 后 import 和 CLI 各跑一次
- [ ] 三个 JS 文件 `node --check` 通过
- [ ] CLI 的 `init` 跑两次只产生一份（幂等）
- [ ] CLI 的 `remove` 能删干净
- [ ] 版本号符合 semver（首次发布 1.0.0）
- [ ] 已知问题写进 README 或 Release notes

## 发布时

- [ ] `git init` + 首次 commit（信息用 Conventional Commits 格式）
- [ ] 远程仓库指向正确，默认分支 `main`
- [ ] 首次 push 成功，仓库可见
- [ ] 打 `v1.0.0` tag 并 push
- [ ] 创建 Release，粘贴变更说明
- [ ] 仓库 Description 一句话写清项目是干什么的
- [ ] 给仓库加 Topics（如 `ai` `agents` `prompt-engineering`）
- [ ] **确认没有把 token 写进任何提交**

## 长期运营

- [ ] 开启 Dependabot alerts（Code security 设置里）
- [ ] 配好 3 个 Actions（语法检查 / 打包自检 / tag 发 Release）
- [ ] Issue 模板可选（`.github/ISSUE_TEMPLATE/bug_report.md`）
- [ ] `docs/devlog.md` 建立并写第一篇
- [ ] 定一个复查节奏（比如每月看一次 Issue 和 Actions 状态）

---

# 五、这份需求里我调整过的地方

你给的模板是通用的，我按项目实际情况改了几处，列出来免得你以为我漏了：

| 原要求 | 我的处理 | 原因 |
|---|---|---|
| 「推荐自动化场景」 | 只保留 3 个 | 单人项目的自动化超过省下的时间就是负债 |
| 「分支管理建议」 | 标为视情况而定，给 4 种场景 | 单人开分支通常白干 |
| 「README 必要模块」 | 按你的受众调了顺序，第 8 项提前强调 | 能力边界是可信度来源，最容易被跳过 |
| 协议推荐 | 明确给 MIT，但写了「什么时候改主意」 | 你要的是建议不是选项罗列 |
| 平台 | 按「仅 GitHub」写，并指出会改动 README 的 npx 用法 | 这是模板与现实的真实冲突 |

**还需要你确认的一件事**：仅 GitHub 意味着 DSH 用户没法一句命令安装，只能 clone 后本地挂载。如果你能接受这个代价，README 里那几处 `npx` 我改成 clone 版；如果不能接受，就得重新考虑发 npm（需要 npm 账号）。
