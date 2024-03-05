import { commitRender, getCurrentFunctionFiber, getHookIndex } from "./fiber";

// 一个 hook 对应一个 hook 对象，一个 hook 对象存在有环 update 对象
export function useState(initial) {
  const currentFunctionFiber = getCurrentFunctionFiber();
  const hookIndex = getHookIndex();

  // 取旧 fiber 的 hook
  const oldHook = currentFunctionFiber?.alternate?.hooks?.[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };
  // update 对象 { action,next }
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = action(hook.state);
  });

  const setState = (action) => {
    if (typeof action === "function") {
      hook.queue.push(action);
    } else {
      hook.queue.push(() => {
        return action;
      });
    }
    commitRender();
  };

  currentFunctionFiber.hooks.push(hook);

  return [hook.state, setState];
}
