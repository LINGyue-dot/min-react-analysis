export function commitRoot(rootFiber) {
  commitWork(rootFiber.child);
}

function commitWork(fiber) {
  if (!fiber) return;

  // 深度优先遍历、先遍历 child 再遍历 sibling
  commitWork(fiber.child);
  let parentDom = fiber.return.stateNode;
  if (fiber.stateNode) parentDom.appendChild(fiber.stateNode);
  commitWork(fiber.sibling);
}
