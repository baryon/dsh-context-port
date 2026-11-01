# 为 Otoha 市场准备的内容

来源：OtohaAI 仓库的 `Apps/PluginPorts/dsh-context`，提交 `f3593bce9d900fbe892cbeee342ad64e00a7edef`（版本 0.1.1，许可 Apache-2.0；改编自 dsh，见 `NOTICE.md`）。文件取自这个提交，不是工作副本。

- `dist/app.html`：用包里的 `build.mjs` 构建的页面，一个文件。构建用的包装在临时文件夹里：@modelcontextprotocol/ext-apps 2.0.3、React 19.3.0、Vite 8.3.1，版本见 `package-lock.json`。
- `dist/THIRD_PARTY_NOTICES.txt`：打进页面的第三方包和它们的许可全文（`build.mjs` 生成）。
- 服务 `stdio.mjs` 只用 Node 自带的模块，`.mcp.json` 用 `node stdio.mjs` 启动，不需要安装任何东西。
- 没有带上测试（`test/`）、本机试运行脚本 `trial.mjs` 和 `.gitignore`。

构建用的是 Node 24.13.0。重新生成：在市场仓库运行 `node ports/dsh-context/prepare.mjs --source <OtohaAI 工作副本> --commit f3593bce9d90 --out <新文件夹>`。

| 文件 | SHA-256 |
|------|---------|
| dist/app.html | `cddd50de101d976794fb21506ff3be731e68ca0e21f661374f6d95167fea32d0` |
| stdio.mjs | `31a5d1e0a388a467df3cbc687687be79eaebcc78619d4cb1ab24c84b1dafa9c9` |
| server.mjs | `34b73d38771f1b63de50ce30339d03bc7f3814841633e18a2ca3d6ba1348a557` |
