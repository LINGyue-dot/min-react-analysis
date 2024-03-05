import { commitRender, getCurrentFunctionFiber, getHookIndex } from "./fiber";

export function useState(initial) {
  const currentFunctionFiber = getCurrentFunctionFiber();
  const hookIndex = getHookIndex();

  // 取旧 fiber 的 hook
  console.log(currentFunctionFiber);
  const oldHook = currentFunctionFiber?.alternate?.hooks?.[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

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
