---
name: deye-alert-diagnosis
description: "DeyeCloud 告警诊断助手 — 查电站/设备告警、看故障详情、判断严重等级。用自然语言快速定位电站异常。Use when a user asks about alarms, faults, alerts, warnings, error codes, device offline, 设备故障, 告警, 报警, 警告, 故障, 离线, 异常, 什么问题, 哪里坏了, alert list, fault diagnosis, what's wrong with my station."
version: 1.1.0
---

# DeyeCloud 告警诊断助手

> 通过 DeyeCloud OpenAPI 的 `/v1.0/station/alertList` 与 `/v1.0/device/alertList` 端点，用自然语言查询电站或设备级别的告警列表，并按等级（故障 / 警告 / 提示）分类呈现，帮助用户快速定位异常。

## 🚀 使用引导

**用户首次询问告警时，AI 应：**

1. 调用 `list_stations` 列出用户电站，展示给用户选择。
2. 用户选择后，记住 `stationId`。
3. 调用告警查询工具，按等级分类输出。

用户也可以直接说电站名，AI 调 `list_stations` 搜索匹配即可。

**如果用户已指定设备 SN**，直接走设备级告警查询。

---

## 📋 Skill 场景

### 场景 1：电站告警总览

**触发词**：电站告警、有什么报警、station alerts、any alarms on my station、电站有什么问题

**组合工具**：

| 步骤 | 工具 | 作用 |
|------|------|------|
| 1 | `list_stations` | 拿到 stationId |
| 2 | `station_alert_list` | 电站级告警列表 |

**参数**（已验证）：

```
POST /v1.0/station/alertList
Body: {
  "stationId": 1760000000001,       // int, 电站ID
  "startTimestamp": 1728526558,    // int, 10位Unix秒
  "endTimestamp": 1733796958,      // int, 10位Unix秒
  "page": 1,                       // int, 可选, 默认1
  "size": 20                       // int, 可选, 默认20, 最大200
}
```

> ⚠️ `startTimestamp` 和 `endTimestamp` 为必填字段，不传会返回 `2101006 endTimestamp can't be null, startTimestamp can't be null`

**输出建议**：
- 按等级分组：故障 N 条 / 警告 N 条 / 提示 N 条
- 每条：设备 SN + 设备类型 + 告警名称 + 等级 + 时间
- 故障项红色高亮，置顶

### 场景 2：单设备告警下钻

**触发词**：这台逆变器有什么告警、设备故障、device alerts、what's wrong with SN xxx

**组合工具**：

| 步骤 | 工具 | 作用 |
|------|------|------|
| 1 | `device_alert_list` | 设备级告警列表 |

**参数**（已验证）：

```
POST /v1.0/device/alertList
Headers: language=zh (可选, 默认en)
Body: {
  "deviceSn": "2345678901",        // string, 设备序列号
  "startTimestamp": 1728526558,    // int, 10位Unix秒
  "endTimestamp": 1733796958,      // int, 10位Unix秒
  "page": 1,                       // int, 可选, 默认1
  "size": 20                       // int, 可选, 默认20, 最大100
}
```

> ⚠️ `startTimestamp` 和 `endTimestamp` 为必填字段。`language` 通过 query param 传入（`?language=zh`），不在 body 中。

**输出建议**：
- 按时间倒序，最近告警在前
- 每条：告警名称 + 等级 + 发生时间 + 恢复时间（如已恢复）
- 若全部已恢复，提示"当前无活跃告警"

---

## 🔧 对应 OpenAPI 端点

| 工具 | OpenAPI 端点 | 方法 | 入参要点 |
|------|------|------|---------|
| `station_alert_list` | `/v1.0/station/alertList` | POST | Body: `{stationId, startTimestamp, endTimestamp, page, size}`，时间为 10 位 Unix 秒 |
| `device_alert_list` | `/v1.0/device/alertList` | POST | Body: `{deviceSn, startTimestamp, endTimestamp, page, size}`，Query: `language=zh` |

均为只读查询，不修改设备状态。

---

## ⚠️ 已知限制（已验证）

- `station/alertList` 和 `device/alertList` 都**必须传 startTimestamp + endTimestamp**（10 位 Unix 秒），不传返回 `2101006`
- `device/alertList` 部分设备返回 `2101040 device not found`（station/device 返回的 SN 在 device 系列接口中可能查不到）
- 若返回空列表，可能是该电站/设备当前确实无告警，或时间范围超出保留期

---

## 🔒 安全

- 本 skill 仅查询告警，不产生控制指令，对设备零影响。
- Token 仅作为 `Authorization: bearer <token>` 传入，不落日志。
