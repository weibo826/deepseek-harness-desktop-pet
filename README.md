# 🐶 DeepSeek Harness 桌面小宠（snoopy-pet 插件）

做桌面小宠，挂在 DeepSeek Harness Web 界面上：

- **形象来自你的素材**：4 姿态图（静止 / 起身 / 行走×2），已自动去背景
- **四脚站立、行走**：连贯帧动画 idle → prepare → walk1 → walk2 → 循环
- **往返巡逻**：站立 10 秒后，以 200px/s 慢速跑向屏幕边缘 → 立即折返跑向另一边 → 跑回起点坐下（无时长限制）
- **行走方向自适应**：向左走面朝左，向右走面朝右（自动镜像）
- **可拖动**：鼠标拖到任意位置，位置自动记忆
- **悬停即停**：小宠移动时鼠标触碰立即停下，移开后恢复巡逻
- **缩放**：悬停左下角 ＋ / − 缩放显示大小（0.4×–2.5×，自动记忆）
- **分时段弹语**：内置 1000 条（600 通用 + 400 分时段），按 清晨 / 上午 / 中午 / 下午 / 下班 / 晚间 / 深夜 七个时段智能切换，覆盖早安、午饭提醒、下班提醒、晚安等场景
- **对话完成语音提醒**：每次 AI 回复结束自动语音播报"对话已完成，请及时查看！"并同时弹气泡提示；悬停小宠右侧 🔊/🔇 可开关
- **出去 / 回去（桌面画中画）**：悬停出现「出去」按钮，或双击小宠，把宠物移到桌面置顶小窗；在桌面再双击（或点「回去」）回到网页端
- **交互**：单击 = 跳舞 + 显示消息；双击 = 网页端 ⟷ 桌面；悬停出现 × 可隐藏（右下角"🐾 小狗在这儿"恢复）
- **自愈**：小宠 DOM 意外丢失自动重建；尊重 `prefers-reduced-motion`

> 桌面画中画依赖浏览器的 **Document Picture-in-Picture** 能力（Edge / Chrome 116+）。
> 注意：浏览器出于安全策略**禁止网页最小化浏览器窗口**，所以「双击 → 网页端最小化」在本方案下
> 表现为「宠物移到桌面置顶小窗」，浏览器留在后台可手动最小化。

## 目录结构

```
snoopy-pet/
├── package.json       # dsh.bundle（patch 层）+ dsh.client（浏览器半体）声明
├── cordis.patch.yml   # Loader 条目：- insert: [{id: snoopy-pet, name: '@dsh-local/snoopy-pet'}]
├── lib/
│   ├── index.js       # 宿主（Node）半体：空 apply，仅为合法 Loader 条目
│   └── client.js      # 浏览器半体：精灵图动画 + 行为状态机（预构建 bundle，无需构建工具）
├── dev/
│   └── pet-test-harness.cjs  # Node 测试桩：模拟浏览器挂载路径
└── README.md
```

## 工作原理（DSH 客户端插件机制）

1. 包声明 `dsh.bundle.patch` → 加入 profile 的 bundle 层，向 Loader 注入条目 `snoopy-pet`
2. 包声明 `dsh.client = { platform: "web", immediately: true }` → Node 半体
   （`@deepseek-ai/dsh-client-modules`）扫描启用的 Loader 条目，解析
   `exports["./client"]`，把 `/plugins/@dsh-local/snoopy-pet/client.js` 挂进
   `window.__DSH_BOOT__` 启动图
3. 浏览器 shell 启动时加载该 bundle（`__ModuleLoader__.load` 注册 factory），
   materialize 后以 `exports.apply(ctx)` 挂载插件——小宠即挂到页面上

## 安装（其他人）

### 方式 A：手动复制（推荐，无需 pnpm）

1. 把 `snoopy-pet` 目录复制到 DSH profile 的 node_modules（hoisted 布局）：

```powershell
Copy-Item -Recurse .\snoopy-pet "C:\Users\Administrator\.dsh\profiles\node_modules\@dsh-local\snoopy-pet"
```

2. 把依赖与 bundle 写进 web profile 清单
   `C:\Users\Administrator\.dsh\profiles\web\package.json`：

```json
{
  "dependencies": { "@dsh-local/snoopy-pet": "1.0.0" },
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@dsh-local/snoopy-pet"] } }
}
```

3. 重启 web 服务（Loader 条目在启动时组合）：

```powershell
node "C:\Users\Administrator\AppData\Local\npm-cache\_npx\<hash>\node_modules\@deepseek-ai\dsh\lib\bin.js" web
```

> 路径中的 `<hash>` 是 npx 缓存目录名，用你本机实际的即可（`Get-ChildItem $env:LOCALAPPDATA\npm-cache\_npx` 可查）。

### 方式 B：pnpm（官方命令）

```bash
dsh plugin --profile web add .\snoopy-pet
```

## 配置（运行时）

| 项目 | 方式 |
|---|---|
| 弹语间隔 | `localStorage.setItem("snoopyPet.intervalMs", "30000")`（5s–60s，默认 45000） |
| 对话完成语音开关 | `localStorage.setItem("snoopyPet.notifyEnabled", "0")` 关闭 / `"1"` 开启（默认开启）；也可悬停点 🔊/🔇 |
| 语音音色 | `localStorage.setItem("snoopyPet.voiceName", "晓伊")` 指定音色；默认自动选自然女声（晓伊/晓晓/云夏/慧慧/瑶瑶…） |
| 位置 | 拖动后自动保存到 `localStorage.snoopyPet.pos` |
| 隐藏/恢复 | 悬停小宠点 × 隐藏；右下角"🐾 小狗在这儿"恢复 |
| 走路速度 | 改 `lib/client.js` 顶部 `WALK_SPEED_PX`（默认 200px/s） |
| 站立时长 | 改 `SIT_MS`（默认 10000ms） |
| 行走帧率 | 改 `WALK_FRAME_MS`（默认 100ms/帧） |

## 卸载

1. 从 `C:\Users\Administrator\.dsh\profiles\web\package.json` 移除依赖与 bundle 条目
2. 删除 `C:\Users\Administrator\.dsh\profiles\node_modules\@dsh-local\snoopy-pet`
3. 重启 web 服务

## 更换小宠图（使用者可配置路径，无需改代码）

插件内置 4 姿态精灵图；想换成自己的小狗（或其他形象），**只需配置一个目录路径**：

1. 准备 4 张 PNG，放到任意目录（例如 `D:\my-pet-sprites`）：
   ```
   idle.png      ← 静止/站立
   prepare.png   ← 起身准备
   walk1.png     ← 行走帧 1
   walk2.png     ← 行走帧 2
   ```
2. 编辑 profile 的 `cordis.patch.yml`（`~/.dsh/profiles/web/cordis.patch.yml`），
   在 `snoopy-pet` 条目下配置 `spritesDir`（取消注释）：

   ```yaml
   - insert:
       - id: snoopy-pet
         name: '@dsh-local/snoopy-pet'
         config:
           spritesDir: 'D:\my-pet-sprites'
   ```

3. 重启 web 服务，刷新页面——插件会优先从 `/snoopy-pet/sprites/{name}.png`
   加载精灵图；未配置目录或某张图缺失时，自动回退到内置图。

> 服务端会把该目录作为静态资源 serve（仅限 `.png`、防目录穿越），
> 图片变更后刷新页面即可生效。

## 分时段语录库（1000 条）

`lib/client.js` 顶部由三个结构驱动弹语：

- `TIME_SLOTS`：7 个时段（`dawn` 清晨 5–8 / `morning` 上午 8–11 / `noon` 中午 11–13 / `afternoon` 下午 13–17 / `offwork` 下班 17–19 / `evening` 晚间 19–23 / `night` 深夜 23–5）
- `GENERIC`：全时段通用语录（建议 / 名言 / 吐槽 / 笑话）
- `SLOT_MESSAGES`：各时段专属语录

`rollMessage()` 按当前小时命中时段，70% 概率取时段专属、30% 取通用。

语录源码为 `messages-*.json`（每个时段/分类一份），改完执行：

```powershell
node merge-messages.cjs   # 重新合并进 lib/client.js
```

## 替换语录（指定路径）

插件支持**不写代码**、直接指定文件路径替换「语录」。在 profile 的
`cordis.patch.yml` 里给 `snoopy-pet` 条目配置 `messagesFile`（绝对路径），
重启 web 服务后刷新页面即可；未配置或文件加载失败时自动回退内置资源。

```yaml
- insert:
    - id: snoopy-pet
      name: '@dsh-local/snoopy-pet'
      config:
        spritesDir: 'D:\my-pet-sprites'        # 可选：精灵图目录
        messagesFile: 'D:\my-pet\messages.txt' # 可选：替换语录
```

### 语录文件格式

- **JSON**（推荐，可带分时段）：

  ```json
  {
    "generic": [{"t": "建议", "s": "累了就趴一会儿。"}],
    "dawn":    [{"t": "早安", "s": "起床吧，太阳都上班了。"}],
    "noon":    [{"t": "午饭", "s": "该吃饭了，别糊弄自己。"}]
  }
  ```

  键：`generic`（全时段通用）＋ 7 个时段键 `dawn / morning / noon / afternoon /
  offwork / evening / night`，均可省略；也可直接给一个数组（等价于只有 `generic`）。

- **纯文本**（简单，每行一条，可选「标签|内容」，默认标签「名言」，`#` 开头为注释）：

  ```
  建议|累了就睡，屋顶上有星星。
  吐槽|会议又臭又长。
  # 下面这行没有标签，默认按“名言”
  真正的酷，是知道什么不值得认真。
  ```

解析成功后**整体替换**内置语录（纯文本视为全时段通用）。

## 维护注意事项（踩坑记录）

修改 `lib/client.js` 时务必遵守，否则插件会挂载后立即被卸载：

1. **`apply` 必须是箭头函数**（无 `prototype`）。普通 function 会被 cordis 的
   `isConstructor` 判定为 class 插件，`ctx.effect` 在失效 fiber 上注册会被立即执行。
2. **`exports` 只能命名导出 `apply`，绝不能加 `exports.default`**——loader 的
   `unwrapExports` 优先取 `.default`，会把插件从 `{apply}` 对象形态解包成裸函数。
3. **teardown 不要删除小宠 DOM**——小宠自包含（`window` 定时器驱动、挂载去重），
   fiber 被卸载后仍应存活。
4. **`#sp-root` 必须 `left:0;top:0`** 钉在视口原点，否则绝对定位子元素会跑到屏幕外。
5. **`pointerdown` 不能 `preventDefault()`**——会抑制 click 事件导致单击/双击失灵。

`dev/pet-test-harness.cjs` 是本地测试桩：用最小 DOM 模拟浏览器挂载路径
（`load → materialize → apply`），改动后先跑它验证：

```powershell
node dev/pet-test-harness.cjs
```

## License

MIT
