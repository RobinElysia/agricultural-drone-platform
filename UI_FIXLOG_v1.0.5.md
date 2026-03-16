# UI/Frontend Fix Log v1.0.5

## 本次目标

1. 删除 `/map` 页面（功能已并入 `DashboardView`）。
2. 审查并整合前端地图飞控能力：将“圈选喷洒区/喷洒轨迹/喷洒模拟/导出喷洒”与“智能路径规划/清除路径/起飞/飞行/暂停/降落”串成统一链路。
3. 聚焦无人机状态数据集成：速度、电量、位置、飞行状态。

## 关键改动

### 1) 删除 `/map` 页面

- 删除路由项：  
  [frontend/src/router/index.ts](D:/code/agricultural-drone-platform/frontend/src/router/index.ts)
- 删除页面文件：  
  [frontend/src/views/MapView.vue](D:/code/agricultural-drone-platform/frontend/src/views/MapView.vue)

### 2) Dashboard 飞控与喷洒链路打通

更新文件：  
[frontend/src/views/DashboardView.vue](D:/code/agricultural-drone-platform/frontend/src/views/DashboardView.vue)

#### 集成策略

- `圈选喷洒区`：进入喷洒区域圈选前，先清理旧飞行路径/喷洒状态，避免双轨状态冲突。
- `喷洒轨迹`：
  - 先基于圈选结果生成喷洒扫描线轨迹；
  - 再按段调用智能避障 `planSmartSegment` 进行风险区绕行；
  - 将最终路径写入原飞控 `pathPoints`（即飞行系统唯一真源路径）。
- `喷洒模拟`：
  - 不再使用独立“第二套模拟计时器”作为主流程；
  - 改为复用原飞行控制：自动触发起飞 -> 飞行 -> 打开喷洒；
  - 由原导航移动回调更新无人机位置、电量、飞行里程。
- `导出喷洒`：
  - 导出包含喷洒参数与轨迹；
  - 同时导出无人机状态快照（状态、速度、高度、电量、位置）与当前飞行路径。

#### 状态集成点

- 速度：`speedValue` 与 `sprayParams.speed` 同步。
- 高度：`heightValue` 与 `sprayParams.altitude` 同步。
- 位置：导航移动时统一更新 `droneState.position` 与选中无人机位置。
- 电量：导航移动里程驱动电量消耗，并回写到选中无人机状态。
- 喷洒轨迹效果：飞行中开启喷洒时，在导航回调里绘制喷洒覆盖圆，暂停/停止/降落/清除时统一清理。

## 验证结果

- 构建验证通过：`cd frontend && npx.cmd vite build`
- 验证点：
  - `/map` 路由与页面移除后可正常构建；
  - Dashboard 仍可正常加载；
  - 喷洒链路可驱动原飞控状态更新。

## 影响文件

- [frontend/src/router/index.ts](D:/code/agricultural-drone-platform/frontend/src/router/index.ts)
- [frontend/src/views/DashboardView.vue](D:/code/agricultural-drone-platform/frontend/src/views/DashboardView.vue)
- [frontend/src/views/MapView.vue](D:/code/agricultural-drone-platform/frontend/src/views/MapView.vue)（已删除）
