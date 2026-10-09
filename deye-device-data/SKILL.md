---
name: deye-device-data
description: "DeyeCloud 设备数据助手 — 查逆变器/采集器/电池最新数据、历史曲线、测点清单。用自然语言获取设备级实时与历史运行数据。Use when a user asks about device real-time data, inverter output, battery SOC, collector status, device history chart, measure points, 逆变器数据, 采集器状态, 电池 SOC, 实时功率, 历史曲线, 测点, device latest data, device history, measure points."
version: 1.1.0
---

# DeyeCloud 设备数据助手

> 通过 DeyeCloud OpenAPI 的设备端点，用自然语言查询单台或多台设备的实时数据、历史曲线与测点定义。

## 🚀 使用引导

**用户首次询问设备数据时，AI 应：**

1. 调用 `list_stations` 列出用户电站，展示给用户选择。用户也可以直接说电站名。
2. 调用 `list_station_devices`（入参 stationIds 数组）拿到设备 SN 清单。
3. 让用户选择设备，记住 `deviceSn`。
4. 根据问题选择工具：实时 → `device_latest`，趋势 → `device_history`，不知字段 → `device_measure_points`。

---

## 📋 Skill 场景

### 场景 1：设备实时数据

**触发词**：逆变器现在多少功率、电池 SOC、采集器状态、device real-time、latest data

**组合工具**：

| 步骤 | 工具 | 作用 |
|------|------|------|
| 1 | `list_station_devices` | 拿 deviceSn（入参 stationIds 数组） |
| 2 | `device_latest` | 最新数据（批量≤10） |

**输出建议**：
- 关键指标表格：功率 / 电压 / 电流 / SOC / 温度 / 状态
- 异常值（如 SOC 过低、功率为负）高亮提示

### 场景 2：设备历史曲线

**触发词**：历史曲线、今天发电趋势、device history、power trend

**组合工具**：

| 步骤 | 工具 | 作用 |
|------|------|------|
| 1 | `device_history` | 按日期范围查历史 |

**参数**（已验证）：

```
POST /v1.0/device/history
Body: {
  "deviceSn": "2345678901",        // string, 设备序列号
  "startAt": "2026-08-20",         // string, 日期格式 YYYY-MM-DD
  "endAt": "2026-08-22",           // string, 日期格式 YYYY-MM-DD
  "granularity": 2,               // int, 1=分钟级, 2=日汇总
  "measurePoints": [...]           // granularity=1 时必传, granularity=2 时不传
}
```

- **granularity=1**（分钟级）：返回 dataList，每条含 time(Unix秒) + itemList(key/value/unit)。必须传 measurePoints，否则返回 `2101006 if granularity == 1，measurePoints should be passed`
- **granularity=2**（日汇总）：返回 dataList，每条含 time(日期) + itemList。不传 measurePoints

**granularity=2 返回字段**：

| 字段 | 含义 | 单位 |
|------|------|------|
| `ChargingCapacity` | 电池充电量（仅 PV 充电） | kWh |
| `DischargingCapacity` | 电池放电量 | kWh |
| `Production` | 发电量 | kWh |
| `GridFeed-in` | 电网卖电(馈电) | kWh |
| `Consumption` | 负载用电量 | kWh |
| `ElectricityPurchasing` | 电网购电（不含电网→电池充电） | kWh |

> ⚠️ `ElectricityPurchasing` 只统计电网→负载直接供电，不含电网→电池充电电量；`ChargingCapacity` 只统计 PV 充电，纯储能电站恒为 0。

### 场景 3：测点清单

**触发词**：这设备有哪些数据、能查什么、measure points、what data can I get

**组合工具**：

| 步骤 | 工具 | 作用 |
|------|------|------|
| 1 | `device_measure_points` | 测点定义 |

**输出建议**：
- 测点名称 + 单位 + 说明
- 便于用户后续指定要查的字段

---

## 🔧 对应 OpenAPI 端点

| 工具 | OpenAPI 端点 | 方法 | 入参要点 |
|------|------|------|---------|
| `device_latest` | `/v1.0/device/latest` | POST | Body: `{deviceList: [sn1, sn2, ...]}`，批量≤10 |
| `device_history` | `/v1.0/device/history` | POST | Body: `{deviceSn, startAt, endAt, granularity, measurePoints}`，日期格式 YYYY-MM-DD |
| `device_measure_points` | `/v1.0/device/measurePoints` | POST | Body: `{deviceSn}` |

均为只读查询。

---

## ⚠️ 已知限制

- `device/latest` 仅有缓存的设备返回数据，无缓存的设备返回空 `deviceDataList`（不报错）
- `device/measurePoints` 对 COLLECTOR/BATTERY 类型返回 `2104005 device not supported`；部分 INVERTER 可能返回 `2101040 device not found`
- `device/history` 的 granularity 最大为 4；granularity=3 始终返回 `invalid param`，不可用
- granularity=4（月度）入参日期格式必须为 `YYYYMM`（如 `"202608"`），用 `YYYY-MM-DD` 会返回 `invalid param`

---

## 🔒 安全

- 本 skill 仅读取设备数据，不下发任何控制指令。
- Token 仅作为 `Authorization: bearer <token>` 传入，不落日志。
- 单次 `latest` 最多 10 台设备，超出需分批。
