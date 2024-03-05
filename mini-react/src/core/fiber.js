import { commitRoot } from "./commit";
import ReactDOM from "./react-dom";
import { reconcileChildren } from "./reconcile";
let nextUnitOfWork = null;
let workInProgressRoot = null; // 当前工作的 fiber 树根
let currentRoot = null; // 上一次渲染的 fiber 树根
let deletions = []; // 要删除 dom 的 fiber

let currentFunctionFiber = null; // 当前正在执行的函数对应 fiber
let hookIndex = 0; // 当前正在执行的函数组件 hook 索引

export function createRoot(element, container) {
  workInProgressRoot = {
    stateNode: container, // 记录对应的真实 DOM
    // 虚拟 DOM
    element: {
      props: { children: [element] },
    },
    alternate: currentRoot,
  };
  nextUnitOfWork = workInProgressRoot;
}

/**
 * 执行当前工作单元 fiber 并设置下一个执行单元
 * 1. 根据 fiber 创建 DOM
 * 2. 构造 fiber 树
 * 3. 设置下一工作单元
 */
function performUnitOfWork(workInProgress) {
  // 根据 fiber 创建 DOM
  if (!workInProgress.stateNode) {
    // 创建 DOM 节点
    workInProgress.stateNode = ReactDOM.renderDOM(workInProgress.element);
  }

  // 构建 fiber 树
  let children =
    workInProgress.element.props && workInProgress.element.props.children;
  let type = workInProgress.element.type;
  if (typeof type === "function") {
    // React 组件，这里默认只考虑函数组件
    // 生成/更新函数组件的 fiber
    updateFunctionComponent(workInProgress);
  }

  if (children || children === 0) {
    // 存在 children 时候
    let elements = Array.isArray(children) ? children : [children];
    elements = elements.flat();

    reconcileChildren(workInProgress, elements);
  }

  // 设置下一个工作单元
  // 根据遍历顺序，深度遍历 + 兄弟节点遍历 --> 优先 child 后 sibling
  if (workInProgress.child) {
    nextUnitOfWork = workInProgress.child;
  } else {
    let nextFiber = workInProgress;
    while (nextFiber) {
      if (nextFiber.sibling) {
        //
        nextUnitOfWork = nextFiber.sibling;
        return;
      } else {
        // 当前没有 sibling 的话返回父节点
        nextFiber = nextFiber.return;
      }
    }
    // 若返回最顶层，表示迭代结束，将 nextUnitOfWork 清空
    if (!nextFiber) nextUnitOfWork = null;
  }
}

// 处理循环和中断逻辑
function workLoop(deadline) {
  // 中断标识位
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  // 本次更新的 fiber 树已构建完成，进入 commit 阶段
  if (!nextUnitOfWork && workInProgressRoot) {
    // 进入 commit 阶段
    commitRoot(workInProgressRoot);
    // commit 结束，保留现在的 fiber 树
    deletions = [];
    currentRoot = workInProgressRoot;
    workInProgressRoot = null;
  }
  requestIdleCallback(workLoop);
}

// 函数组件更新 -> 生成函数组件对应的 fiber 
function updateFunctionComponent(fiber) {
  currentFunctionFiber = fiber;
  currentFunctionFiber.hooks = [];
  hookIndex = 0;
  const { props, type: Fn } = fiber.element;
  const jsx = Fn(props);
  reconcileChildren(fiber, [jsx]);
}

// 开始更新渲染逻辑
export function commitRender() {
  workInProgressRoot = {
    stateNode: currentRoot.stateNode,
    element: currentRoot.element,
    alternate: currentRoot,
  };
  nextUnitOfWork = workInProgressRoot;
}

export function deleteFiber(fiber) {
  deletions.push(fiber);
}
export function getDeletions() {
  return deletions;
}

export function getCurrentFunctionFiber() {
  return currentFunctionFiber;
}
export function getHookIndex() {
  return hookIndex++;
}

requestIdleCallback(workLoop);
