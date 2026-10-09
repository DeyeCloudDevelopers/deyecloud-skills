---
name: deye-config-query
description: "DeyeCloud 配置查询助手 — 查系统工作模式、电池参数、ToU 时段配置。只读查询电站当前运行参数。Use when a user asks about system work mode, battery configuration, TOU settings, current config, 系统模式, 工作模式, 电池配置, 电池参数, ToU, 分时段, 当前配置, 运行参数, config battery system tou."
version: 1.1.0
---

# DeyeCloud 配置查询助手

> 通过 DeyeCloud OpenAPI 的 `/v1.0/config/system`、`/v1.0/config/battery`、`/v1.0/config/tou` 端点，用自然语言只读查询设备当前的运行配置，包括系统工作模式、电池相关参数、分时段（Time of Use）配置。

## 🚀 使用引导

**用户首次询问配置时，AI 应：**

1. 调用 `list_stations` 列出用户电站，展示给用户选择。用户也可以直接说电站名。
2. 调用 `list_station_devices`（入参 stationIds 数组）拿到设备 SN。
3. 根据问题选择对应配置端点查询。
4. 用表格清晰呈现参数名 + 当前值 + 单位。

---

## 📋 Skill 场景

### 场景 1：系统工作模式查询

**触发词**：系统什么模式、工作模式、system work mode、current mode

**组合工具**：

| 步骤 | 工具 | 作用 |
|------|------|------|
| 1 | `list_station_devices` | 拿 deviceSn（入参 stationIds 数组） |
| 2 | `config_system` | 系统工作模式相关参数 |

**输出建议**：
- 当前工作模式（如 SELLING_FIRST / ZERO_EXPORT_TO_LOAD / ZERO_EXPORT_TO_CT）
- 能量模式（BATTERY_FIRST / LOAD_FIRST）等关联参数

### 场景 2：电池参数查询

**触发词**：电池配置、电池参数、battery config、SOC 上下限

**组合工具**：

| 步骤 | 工具 | 作用 |
|------|------|------|
| 1 | `config_battery` | 电池相关参数 |

**输出建议**：
- 充放电 SOC 上下限、电池容量、循环寿命、电池类型等
- 异常配置（如上下限倒置）提示

### 场景 3：ToU 分时段配置查询

**触发词**：ToU 配置、分时段、时段表、time of use

**组合工具**：

| 步骤 | 工具 | 作用 |
|------|------|------|
| 1 | `config_tou` | ToU 配置 |

**输出建议**：
- 时段表：时段 + 起止时间 + 充放电策略
- 标注是否启用

---

## 🔧 对应 OpenAPI 端点

| 工具 | OpenAPI 端点 | 方法 | 入参 |
|------|------|------|------|
| `config_system` | `/v1.0/config/system` | POST | Body: `{deviceSn}` |
| `config_battery` | `/v1.0/config/battery` | POST | Body: `{deviceSn}` |
| `config_tou` | `/v1.0/config/tou` | POST | Body: `{deviceSn}` |

均为只读查询，不修改设备配置。如需修改，请使用 `deye-device-control` skill。

---

## ⚠️ 已知限制（已验证）

- 三个 config 端点**均需设备在线**：离线设备返回 `2104006 device offline`
- 部分在线设备可能返回 `2101022 business error`（设备型号不支持该配置项）
- 建议先通过 `list_station_devices` 确认设备 `connectStatus=1`（在线）后再调用

---

## 🔒 安全

- 本 skill 仅读取配置，不产生控制指令，对设备零影响。
- Token 仅作为 `Authorization: bearer <token>` 传入，不落日志。
- 配置值是设备当前实际生效值，可能与 App 显示有同步延迟。
