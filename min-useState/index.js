function dispatchAction(queue, action) {
  const update = {
    action,
    next: null,
  };

  if (queue.pending === null) {
    update.next = update;
  } else {
    update.next = queue.pending.next;
    queue.pending.next = update;
  }
  queue.pending = update;

  // React 开始调度更新
  schedule();
}

function schedule() {
  // 更新时候重置 workInProgress 指针为 fiber 保存的第一个 hook
  workInProgressHook = fiber.memorizeState;
  // 触发 render
  fiber.stateNode();
  //
  isMounted = false;
}

function useState(initialState) {
  let hook;

  if (isMounted) {
    // 初始化
    hook = {
      queue: {
        pending: null,
      },
      memorizeState: initialState,
      next: null,
    };

    // 该 hook 是 render 函数第一个声明的 hook
    if (!fiber.memorizeState) {
      fiber.memorizeState = hook;
    } else {
      workInProgressHook.next = hook;
    }
    workInProgressHook = hook;
  } else {
    // 更新
    hook = workInProgressHook;
    workInProgressHook = workInProgressHook.next;
  }

  // state 值
  let baseState = hook.memorizeState;
  // 调用了 setState ，存在更新队列
  if (hook.queue.pending) {
    let firstUpdate = hook.queue.pending.next;
    // 执行更新操作，计算值
    do {
      // @warning 真实情况这里可能存在批量更新的情况
      const action = firstUpdate.action;
      baseState = action(baseState);
      firstUpdate = firstUpdate.next;
    } while (firstUpdate !== hook.queue.pending.next);
    hook.queue.pending = null;
  }

  hook.memorizeState = baseState;

  return [baseState, dispatchAction.bind(null, hook.queue)];
}
