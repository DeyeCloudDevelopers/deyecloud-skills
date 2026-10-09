---
name: deye-device-control
description: "DeyeCloud 设备控制助手 — 下发控制指令、查指令执行结果。用自然语言管理设备运行参数与策略。Use when a user asks to change work mode, battery settings, TOU schedule, power limit, solar sell, 削峰填谷, 工作模式, 电池控制, ToU 设置, 限功率, order, control, command."
version: 1.1.0
---

# DeyeCloud 设备控制助手

> 通过 DeyeCloud OpenAPI 的 order 和 strategy 系列端点，用自然语言下发设备控制指令并查询执行结果。

## 🔒 安全确认机制

**每次下发控制指令前，AI 必须：**

1. **复述指令**：用自然语言向用户复述即将下发的指令内容（设备 SN + 操作 + 目标值）。
2. **等待确认**：用户明确回复"确认/yes/执行"后才下发；用户未确认则不下发。
3. **返回 orderId**：下发后立即返回 `orderId`，并提示用户可用"查指令结果"追问执行状态。

---

## 🚀 使用引导

**用户首次控制时（不知道 deviceSn），AI 应：**

1. 调用 `list_station_devices`（入参 stationIds 数组）拿到设备 SN。
2. 让用户确认目标设备。
3. 复述指令 → 等用户确认 → 下发 → 返回 orderId。

---

## 📋 Skill 场景

### 场景 1：电池充放电控制

**触发词**：电池模式、充放电开关、battery mode control

**工具**：`order_battery_mode_control`（启用/禁用 chargeMode）
**关联参数更新**：`order_battery_parameter_update`、`order_battery_type_update`

### 场景 2：系统工作模式 / 能量模式

**触发词**：切工作模式、能量模式、work mode、energy pattern

**工具**：
- `order_sys_work_mode_update` — SELLING_FIRST / ZERO_EXPORT_TO_LOAD / ZERO_EXPORT_TO_CT
- `order_sys_energy_pattern_update` — BATTERY_FIRST / LOAD_FIRST

### 场景 3：功率限制

**触发词**：最大功率、限功率、MAX_SELL_POWER、MAX_SOLAR_POWER

**工具**：`order_sys_power_update`

### 场景 4：削峰填谷 / 智能负载

**触发词**：削峰填谷、grid peak shaving、智能负载、smartload

**工具**：
- `order_grid_peak_shaving_control` — 启用/禁用
- `order_smartload_update` — 参数设置

### 场景 5：ToU / 太阳能卖出

**触发词**：ToU 开关、分时段开关、太阳能卖出、solar sell

**工具**：
- `order_sys_tou_switch` — ToU 开关
- `order_sys_tou_update` — ToU 时段设置
- `order_sys_solar_sell_control` — 太阳能卖出开关

### 场景 6：限流控制

**触发词**：限流、限流模式、limit control

**工具**：`order_sys_limit_control` — SELL_FIRST / ZERO_EXPORT_TO_UPS_LOAD / ZERO_EXPORT_TO_CT / ZERO_EXPORT_TO_WIRELESS_CT

### 场景 7：自定义 Modbus 指令

**触发词**：自定义指令、modbus、custom control

**工具**：`order_custom_control` — 直接发送 Modbus 协议指令（高级用法，需用户明确寄存器/值）

### 场景 8：动态策略控制

**触发词**：AI 策略、动态策略、dynamic control

**工具**：
- `strategy_dynamic_control` — 下发动态策略
- `strategy_dynamic_control_read` — 读取策略（部分设备返回 `2101040 device not found`）
- `strategy_dynamic_control_read_result` — 读取执行结果（需 orderId 轮询）

### 场景 9：指令执行结果查询

**触发词**：指令结果、执行了吗、order result、command status

**工具**：`order_by_order_id`（GET `/v1.0/order/{orderId}`）— 按 orderId 查询指令执行结果

---

## 🔧 对应 OpenAPI 端点

| 工具 | OpenAPI 端点 | 方法 | 说明 |
|------|------|------|------|
| `order_battery_mode_control` | `/v1.0/order/battery/modeControl` | POST | 启用/禁用充放电 |
| `order_battery_parameter_update` | `/v1.0/order/battery/parameter/update` | POST | 电池参数 |
| `order_battery_type_update` | `/v1.0/order/battery/type/update` | POST | 电池类型 |
| `order_sys_work_mode_update` | `/v1.0/order/sys/workMode/update` | POST | 工作模式 |
| `order_sys_energy_pattern_update` | `/v1.0/order/sys/energyPattern/update` | POST | 能量模式 |
| `order_sys_power_update` | `/v1.0/order/sys/power/update` | POST | 功率限制 |
| `order_sys_limit_control` | `/v1.0/order/sys/limitControl` | POST | 限流模式 |
| `order_grid_peak_shaving_control` | `/v1.0/order/gridPeakShaving/control` | POST | 削峰填谷 |
| `order_smartload_update` | `/v1.0/order/smartload/update` | POST | 智能负载 |
| `order_sys_tou_switch` | `/v1.0/order/sys/tou/switch` | POST | ToU 开关 |
| `order_sys_tou_update` | `/v1.0/order/sys/tou/update` | POST | ToU 时段 |
| `order_sys_solar_sell_control` | `/v1.0/order/sys/solarSell/control` | POST | 太阳能卖出 |
| `order_custom_control` | `/v1.0/order/customControl` | POST | 自定义 Modbus |
| `strategy_dynamic_control` | `/v1.0/strategy/dynamicControl` | POST | 动态策略下发 |
| `strategy_dynamic_control_read` | `/v1.0/strategy/dynamicControl/read` | POST | 读取策略 |
| `strategy_dynamic_control_read_result` | `/v1.0/strategy/dynamicControl/readResult` | POST | 读取结果 |
| `order_by_order_id` | `/v1.0/order/{orderId}` | GET | 指令结果 |

---

## ⚠️ 已知限制

- 所有 order 和 strategy 端点**均需设备在线**，离线设备返回 `2104006 device offline`
- `strategy/dynamicControl/read` 部分设备返回 `2101040 device not found`
- `order_by_order_id` 为 GET 请求，orderId 在 URL path 中
- 控制指令下发后需等待设备执行，建议用 `order_by_order_id` 轮询结果

---

## 🔒 安全与确认机制

- **强制确认**：每次下发前必须复述指令并等用户确认，禁止"静默执行"。
- **orderId 追溯**：每次下发返回 orderId，用户可随时查执行结果。
- **只读优先**：建议先用 `deye-config-query` skill 查当前配置，再决定是否下发控制。
- **回滚提示**：部分操作可逆（如开关类），部分不可逆（如 Modbus 寄存器写入），AI 应提示风险。
- Token 仅作为 `Authorization: bearer <token>` 传入，不落日志。
