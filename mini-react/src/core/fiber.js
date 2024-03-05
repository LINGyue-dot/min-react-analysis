let nextUnitOfWork = null;
let rootFiber = null;

export function createRoot(element, container) {
  rootFiber = {
    stateNode: container, // 记录对应的真实 DOM
    element: {
      props: { children: [element] },
    },
  };
  nextUnitOfWork = rootFiber;
}
