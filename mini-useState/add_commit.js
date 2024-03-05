let workInProgressHook;
let isMounted = true;

// 当前函数组件的 fiber
const fiber = {
  memoizedState: null, // hook 对象链表
  stateNode: App,
};

// 调度
function schedule() {
  workInProgressHook = fiber.memoizedState;
  const app = fiber.stateNode();
  commit(app.num);
  isMounted = false;
  return app;
}

// 将 action 塞入 hook 对象中
function dispatchAction(queue, action) {
  const update = {
    action,
    next: null,
  };
  if (queue.pending === null) {
    queue.pending = update;
    update.next = update;
  } else {
    update.next = queue.pending.next;
    queue.pending.next = update;
  }
  queue.pending = update;
  // 执行调度
  // !!! 这里就不支持一个 function component 多个 useState hook
  schedule();
}

function useState(initialState) {
  let hook;

  // 初始化创建 hook 链表
  if (isMounted) {
    hook = {
      queue: {
        pending: null, // update 对象环状链表
      },
      memoizedState: initialState, // 值
      next: null,
    };

    if (!fiber.memoizedState) {
      fiber.memoizedState = hook;
    } else {
      workInProgressHook.next = hook;
    }
    workInProgressHook = hook;
  } else {
    // 更新，寻找当前 useState 对应的 hook 对象
    hook = workInProgressHook;
    workInProgressHook = workInProgressHook.next;
  }

  // 执行所有的 update action
  // 下次执行组件函数时候执行
  let baseState = hook.memoizedState;
  if (hook.queue.pending) {
    let firstUpdate = hook.queue.pending.next;
    do {
      const action = firstUpdate.action;
      baseState = action(baseState);
      firstUpdate = firstUpdate.next;
    } while (firstUpdate !== hook.queue.pending.next);
    hook.queue.pending = null;
  }
  hook.memoizedState = baseState;

  return [baseState, dispatchAction.bind(null, hook.queue)];
}

// demo
function App() {
  const [num, setNum] = useState(0);
  console.log(`${isMounted ? "mount" : "update"} num: `, num);
  return {
    click() {
      setNum((i) => i + 1);
    },
    num,
  };
}

document.querySelector("#container").onclick = schedule().click;

// 更新 UI
function commit(num) {
  document.querySelector("#container").innerHTML = `${num}`;
}
