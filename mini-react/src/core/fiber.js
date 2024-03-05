import { commitRoot } from "./commit";
import ReactDOM from "./react-dom";
let nextUnitOfWork = null;
let rootFiber = null;

export function createRoot(element, container) {
  rootFiber = {
    stateNode: container, // 记录对应的真实 DOM
    // 虚拟 DOM
    element: {
      props: { children: [element] },
    },
  };
  nextUnitOfWork = rootFiber;
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
  let children =
    workInProgress.element.props && workInProgress.element.props.children;
  let type = workInProgress.element.type;
  if (typeof type === "function") {
    // React 组件，这里默认只考虑函数组件
    const { props, type: Fn } = workInProgress.element;
    const jsx = Fn(props);
    children = [jsx]; // 默认同一用数组进行表示
  }

  // 构建 fiber 树
  if (children || children === 0) {
    // 存在 children 时候
    let elements = Array.isArray(children) ? children : [children];
    elements = elements.flat();

    let index = 0;
    let prevSibling = null; // 记录上一个兄弟节点
    while (index < elements.length) {
      const element = elements[index];
      const newFiber = {
        element,
        return: workInProgress,
        stateNode: null,
      };
      // 创建
      if (index === 0) {
        workInProgress.child = newFiber;
      } else {
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
      index++;
    }
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
  if (!nextUnitOfWork && rootFiber) {
    commitRoot(rootFiber);
    rootFiber = null;
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);
