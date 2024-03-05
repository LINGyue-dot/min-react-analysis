





阶段分析



1. commit 阶段：执行具体的 JS 操作。如新建：通过 `appendChild` 添加 fiber.dom 到 parent 上。删除：通过 `removeChild` 删除节点。
   * 目的是：异步中断渲染情况下，避免出现不完整的 UI 
2. reconcile 阶段：对比 fiber 节点，建立/新的 fiber 节点
   * 目的是：执行更新操作。（初始化也看作是更新操作）