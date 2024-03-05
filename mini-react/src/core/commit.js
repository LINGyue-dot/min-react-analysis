import { getDeletions } from "./fiber";
import { updateAttributes } from "./react-dom";

export function commitRoot(rootFiber) {
  const deletions = getDeletions();
  deletions.forEach(commitWork);
  commitWork(rootFiber.child);
}

function commitWork(fiber) {
  if (!fiber) return;

  // 深度优先遍历、先遍历 child 再遍历 sibling
  commitWork(fiber.child);
  let parentDom = fiber.return.stateNode;

  if (fiber.flag === "Deletion") {
    if (typeof fiber.element?.type !== "function") {
      parentDom.removeChild(fiber.stateNode);
    }
    return;
  }

  if (fiber.flag === "Placement" && fiber.stateNode) {
    // 添加 dom
    const targetPositionDom = parentDom.childNodes[fiber.index]; //要插入的那个节点的之前节点
    if (targetPositionDom) {
      parentDom.insertBefore(fiber.stateNode, targetPositionDom);
    } else {
      parentDom.appendChild(fiber.stateNode);
    }
  }
  if (fiber.flag === "Update") {
    const { children, ...newAttributes } = fiber.element.props;
    const oldAttributes = fiber.alternate.element.props;
    updateAttributes(fiber.stateNode, newAttributes, oldAttributes);
  }

  commitWork(fiber.sibling);
}
