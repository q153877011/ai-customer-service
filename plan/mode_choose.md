# 应用类型（Mode）自动识别与快捷通道方案

> 通过可选环境变量让用户指定应用类型，跳过运行时探测；未指定时保持动态探测，根据 Dify API 返回数据自动识别 chat / agent / workflow / completion。

---

## 一、现状

当前每次进入页面都会发两个并行预请求来动态探测 appType：

```
GET /api/parameters   → 获取应用配置（输入表单、文件上传、TTS/STT 开关等）
GET /api/meta         → 获取应用元信息（名称、图标、工具列表等）
```

探测函数 `utils/detect-app-type.ts` 根据返回数据的特征字段推断应用类型：

| 条件 | 结论 |
|---|---|
| `parameters` 返回里有 `workflow` 字段 | → `workflow` |
| 没有 `speech_to_text` / `suggested_questions_after_answer` / `text_to_speech` | → `completion` |
| 有上述聊天特征 + `meta.tool_icons` 非空 | → `agent` |
| 有上述聊天特征 + 没有 tool_icons | → `chat` |

### 现状问题

- 每次进入页面都有两个预请求，虽然轻量但引入了不确定性。
- `detectAppType()` 依赖返回数据的特征字段做推断，如果 Dify 后端返回格式变化，推断可能失准。
- 所有入口页面（首页、`/embed`、`/support`、`AppEntry`）各自重复实现了相同的探测逻辑。

---

## 二、方案：环境变量快捷通道

新增一个**可选环境变量** `NEXT_PUBLIC_APP_TYPE`，让用户确认后直接指定应用类型，跳过推断逻辑。

### 2.1 环境变量定义

```env
# 可选：用户确认的应用类型，设置后跳过运行时探测，直接按此类型渲染
# 可选值：chat | agent | workflow | completion
# 不设置或留空 = 保持动态探测（每次请求 /api/parameters + /api/meta → detectAppType()）
NEXT_PUBLIC_APP_TYPE=
```

### 2.2 判断优先级

```
1. 读取 NEXT_PUBLIC_APP_TYPE 环境变量
2. 如果有值且合法（chat / agent / workflow / completion）→ 直接使用，跳过 detectAppType() 推断
3. 如果为空或不合法 → 走原有动态探测逻辑
```

### 2.3 `.env.example` 更新

```env
# Dify 应用 API Key（必填，仅服务端可读）
APP_KEY=

# Dify API 基础地址（必填，仅服务端可读）
APP_API_URL=

# 前端用来判断"服务端是否已配置"，填 true 即可，不携带任何敏感信息
NEXT_PUBLIC_APP_CONFIGURED=true

# 可选：用户确认的应用类型，设置后跳过运行时探测
# 可选值：chat | agent | workflow | completion
# 不设置 = 自动探测
NEXT_PUBLIC_APP_TYPE=
```

---

## 三、实现方案

### 3.1 新增 `utils/resolve-app-type.ts`

统一收口所有入口页面的 appType 获取逻辑，替换当前散落在各页面的重复代码：

```ts
// utils/resolve-app-type.ts
import type { AppTypeValue } from '@/config'
import { fetchAppParams, fetchAppMeta } from '@/service'
import { detectAppType } from '@/utils/detect-app-type'

const VALID_TYPES: AppTypeValue[] = ['chat', 'agent', 'workflow', 'completion']

/**
 * 获取应用类型：优先读环境变量，否则动态探测
 */
export async function resolveAppType(): Promise<{
  appType: AppTypeValue
  appParams: any
  appMeta: any
  fromEnv: boolean
}> {
  const envType = process.env.NEXT_PUBLIC_APP_TYPE as string | undefined

  if (envType && VALID_TYPES.includes(envType as AppTypeValue)) {
    // 快捷通道：appType 已确定，仍需请求 appParams 初始化客服壳
    const [params, meta] = await Promise.all([
      fetchAppParams().catch(() => null),
      fetchAppMeta().catch(() => null),
    ])
    return {
      appType: envType as AppTypeValue,
      appParams: params,
      appMeta: meta,
      fromEnv: true,
    }
  }

  // 动态探测
  const [params, meta] = await Promise.all([
    fetchAppParams().catch(() => null),
    fetchAppMeta().catch(() => null),
  ])
  return {
    appType: detectAppType(params, meta),
    appParams: params,
    appMeta: meta,
    fromEnv: false,
  }
}
```

### 3.2 重要说明

即使环境变量指定了 appType，`/api/parameters` 和 `/api/meta` 请求**仍然不能跳过**——客服壳的输入区、文件上传、TTS/STT 开关都依赖 `parameters` 返回的配置。

真正节省的是：**`detectAppType()` 的特征推断逻辑不再执行**，appType 直接确定，消除了推断不准的风险。

如果后续想进一步优化（连 parameters 请求也延迟到展开时再发），可以作为第二阶段优化，当前保持简单。

---

## 四、影响范围

### 4.1 需要改动的文件

| 文件 | 改动 |
|---|---|
| `utils/resolve-app-type.ts` | **新增**，统一 appType 获取逻辑 |
| `app/components/index.tsx` | 将 `useEffect` 中的探测逻辑替换为 `resolveAppType()`（AppEntry，供 /support 页面使用） |
| `app/components/demo-home-page.tsx` | 同上，供首页浮窗使用 |
| `app/embed/page.tsx` | 同上，供 /embed 嵌入页使用 |
| `.env.example` | 新增 `NEXT_PUBLIC_APP_TYPE` 字段，移除旧的 `IS_WORKFLOW_ENABLED` |
| `.env` | 新增 `NEXT_PUBLIC_APP_TYPE=`（空值，保持动态探测） |
| `config/index.ts` | 已有 `AppTypeValue` 类型导出，无需变更 |

### 4.2 不需要改动的文件

- `utils/detect-app-type.ts`：保持不变，作为动态探测的后备逻辑。
- `app/support/page.tsx`：直接使用 `AppEntry`，无需单独改动。
- `service/base.ts`、`service/index.ts`：不涉及。
- `app/api/**`：不涉及。

---

## 五、与旧变量的关系

| 旧变量 | 状态 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_APP_TYPE_WORKFLOW` | 废弃 | 布尔值，只能区分 workflow / 非 workflow |
| `IS_WORKFLOW_ENABLED` | 废弃并清除 | 旧布尔变量，在 `.env.example` 中已删除 |
| `config/index.ts` 中的 `IS_WORKFLOW` | 遗留常量，硬编码 `false` | 纳入后续清理 |
| `config/index.ts` 中的 `IS_CHAT_APP` | 遗留常量，硬编码 `true` | 纳入后续清理 |

新变量 `NEXT_PUBLIC_APP_TYPE` 是**枚举值**而非布尔值，覆盖 chat / agent / workflow / completion 四种类型，取代上述所有旧变量。

---

## 六、实施步骤

### Step 1：新增 `utils/resolve-app-type.ts`

按 3.1 节实现，导出 `resolveAppType()` 函数。

### Step 2：统一各入口页面的初始化逻辑

将 `app/components/index.tsx`、`app/embed/page.tsx`、`app/components/demo-home-page.tsx` 中各自的 `useEffect` 探测逻辑替换为：

```ts
useEffect(() => {
  let cancelled = false
  resolveAppType().then(({ appType, appParams, appMeta }) => {
    if (cancelled) return
    setAppType(appType)
    setAppParams(appParams)
    setAppMeta(appMeta)
  })
  return () => { cancelled = true }
}, [])
```

> `/support` 页面通过 `AppEntry` 间接使用，无需单独修改。

### Step 3：更新 `.env.example` 和 `.env`

- 新增 `NEXT_PUBLIC_APP_TYPE=` 字段（留空），附注释说明。
- 移除旧的 `IS_WORKFLOW_ENABLED` 行。

### Step 4：清理旧变量引用（可选，后续进行）

将 `IS_WORKFLOW_ENABLED`、`NEXT_PUBLIC_APP_TYPE_WORKFLOW` 的所有引用纳入删除候选清单，待新方案稳定后统一清理。

---

## 七、验收标准

- [ ] 不设置 `NEXT_PUBLIC_APP_TYPE` 时，行为与改造前完全一致（动态探测）。
- [ ] 设置 `NEXT_PUBLIC_APP_TYPE=chat` 后，页面不再执行 `detectAppType()` 推断，直接按 chat 渲染。
- [ ] 设置非法值（如 `NEXT_PUBLIC_APP_TYPE=xxx`）时，自动降级为动态探测。
- [ ] 所有入口页面（首页、`/embed`、`/support` 经由 `AppEntry`）均使用 `resolveAppType()` 统一入口。
- [ ] `appParams` 和 `appMeta` 请求不受环境变量影响，始终正常发出。

---

## 八、风险点

- **环境变量与实际应用不匹配**：用户设置了 `chat` 但 Dify 应用实际是 `workflow`，会导致 UI 和接口行为不一致。建议在文档中明确说明"此变量仅在用户确认应用类型后设置"。
- **`parameters` 请求仍然存在**：快捷通道并不能完全消除预请求，只是消除了推断不确定性。如需完全消除预请求，需要第二阶段将 parameters 延迟到客服壳展开时再发。
- **旧变量残留**：`config/index.ts` 中仍有 `IS_WORKFLOW = false` / `IS_CHAT_APP = true` 两个遗留常量，暂时无害但应在后续版本统一清理。
