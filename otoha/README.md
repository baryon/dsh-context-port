# dsh-context：Otoha 只读移植版

> last-verified: 2026-10-25

将 dsh-context 0.74.0 的组成卡片、环图、堆叠条及格式化函数用于独立 MCP App。当前范围为一个对话的诊断统计，未移植整个 DeepSeek 运行环境或完整 ContextView。来源、保留代码和修改见 [NOTICE](NOTICE.md)，原许可见 [LICENSE](LICENSE)。未创建远端 fork。

## 作为插件包

`.codex-plugin/plugin.json` 和 `.mcp.json` 让这个文件夹成为 Otoha 插件；清单写明了它的页面 `ui://dsh-context/app.html`，从文件夹安装时 Otoha 据此把它当作插件，而不是技能。插件声明的程序是 `node stdio.mjs`：它和 `server.mjs` 的本机服务回答同样的请求（同一个 `answer`），只是走 stdin 和 stdout，Otoha 用系统的 Node 22 或更新版本启动它，不需要别的依赖。`stdio.mjs` 读取构建好的 `dist/app.html`，所以发布的包里要带 `dist/`。市场的包由市场仓库的 `ports/dsh-context/` 准备脚本按固定提交构建（OAI-1016）；`server.mjs` 只给下面的协议试用脚本用。

## 构建与协议试用

在仓库根目录执行，使用当前 checkout 已安装的 Apps 依赖：

```sh
node Apps/PluginPorts/dsh-context/build.mjs
Apps/node_modules/.bin/tsc -p Apps/PluginPorts/dsh-context/tsconfig.json
node --test Apps/PluginPorts/dsh-context/test/*.test.ts Apps/PluginPorts/dsh-context/test/*.test.mjs
```

生成的 `dist/app.html` 自带 React 和 MCP Apps SDK，不加载远端脚本；`dist/THIRD_PARTY_NOTICES.txt` 收集实际打包依赖的许可。`dist/` 不入库，不嵌入主 renderer，不作为 App 自带技能发布。

先按 DEVELOPMENT.md 选择 Swift 工具链并构建 `otoha-core`，再执行：

```sh
node Apps/PluginPorts/dsh-context/trial.mjs --core .build/debug/otoha-core
```

脚本启动独立的 loopback MCP 服务和临时 Core，配置文件没有模型提供者。使用普通管理接口安装包、启用、注册本机服务、核对工具定义、绑定连接、审核界面、创建明确标注的 fixture 对话、打开对话贡献并读取统计。只对临时对话的宿主统计授权作肯定回答，其他请求拒绝。最后验证关闭与卸载并清理临时目录。不启动浏览器或 Electron，不调用模型，不代表视觉验收。

用 `--upstream /path/to/unpacked/dsh-context-0.74.0` 可同时核验原始发布包的准备结果。读取不会执行原包脚本或加载其 Cordis entry。发布包与固定源码的对应关系仅按版本核对，不宣称原包作者的签名背书。

## 人工试用

先构建开发版 Electron，再运行同一命令并加 `--manual`。脚本完成协议检查后会打印带临时数据目录的启动命令，并持续运行本机服务；在另一个终端执行打印的命令。

在开发版中打开试用项目的 `Fixture chat`，新建浏览器标签，在缺省页的工具区选择「上下文」。首次读取统计时应出现明确的统计授权卡。同意后应显示空态；脚本没有生成模型请求，不能用假数字代替。切换首页、其他对话再返回，应仍属于原对话；关闭、重新打开、断开服务及卸载分别检查授权和内容清理。具体待验收项见 [OAI-952](../../../kanban/issues/OAI-952.md)。

关闭开发版后，在脚本终端按 Ctrl-C，移除本次临时配置、安装和项目。不要在这个协议试用里配置真实账号。

如需验证真实模型请求与用量，交 Claude 询问用户：选择账号和模型，允许发送的测试文字，以及允许的费用上限；或者提供无需付费的本机模型。获得这些条件前，不发送真实模型请求，不读取或复用日常账号配置。

## 读取契约与限制

- 使用标准 `app.readServerResource({ uri: 'otoha-context://current/snapshot' })`。宿主仅允许经审核、仍有效的 conversation 作用域实例读取，页面不能指定账号、项目或其他对话。
- 首次读取单独征求同意，仅当前物理面板会话有效。轮询不反复询问；关闭、替换、撤销或断开后，旧会话失效。此权限不包含原文读取或修改模型上下文。
- 资源内容为 OAI-951 `ContextDiagnosticSnapshot` schema 1 的 JSON，日期用 ISO 8601。宿主 API 仍是 `plugins/viewRequest`，没有新增面向 renderer 的任意诊断查询接口。
- 当前按两秒轮询完整有界快照，使用 epoch/sequence 防止旧响应替换新数据。尚未把 OAI-951 的 watch 流跨进程公开；不存在无限累计的客户端历史。关闭或暂停时取消读取，连接失败时清空旧统计，重试仍固定原对话。
- 显示最近一次实际请求的已知部分估算、服务商报告的用量和缓存读写、压缩统计。技能与模板已包含在系统说明中，单独列出但不重复相加；缓存是输入中的子集，不再加进总输入。保留范围内未知数据与未采集历史不补零，不按字符比例造精确 token，不套用 DeepSeek 的压缩阈值或报价。
- 内核每个对话当前只保留最近 64 条事件，重启后清空。币种未提供时不将金额标成美元。原生上下文不可见时明确标明。
- 余额、凭据、原始提示词/工具结果、附件、跨对话历史、子代理全景与提示词编辑尚不可用。移植界面当前为中文；宿主统计授权卡有中、英、日三语。
- 本机服务只提供界面 HTML 和一个隐藏的只读对话入口。统计由宿主直接提供给隔离页面，不送给 MCP 服务，不通过模型工具结果传递。
