import { deleteFiber } from "./fiber";

/**
 * diff 算法，构建出新的 fiber 树
 * 这里的 diff 算法是简易版，没有 key ，且只能同层严格从左往右进行 diff
 */
export function reconcileChildren(workInProgress, childrenElements) {
  let index = 0; // 当前遍历的节点在父节点下的索引
  let prevSibling = null;
  let oldFiber = workInProgress?.alternate?.child; // 旧 fiber

  while (index < childrenElements.length || oldFiber) {
    const element = childrenElements[index];
    // 创建新的 fiber
    let newFiber = null;
    const isSameType =
      element?.type && element?.type === oldFiber?.element?.type;

    if (isSameType) {
      newFiber = {
        element,
        stateNode: oldFiber.stateNode,
        return: workInProgress,
        alternate: oldFiber,
        flag: "Update", // 副作用标签
      };
    } else {
      // type 不同，表示添加或者删除
      if (element || element === 0) {
        // element 存在，表示替换
        newFiber = {
          element,
          stateNode: null,
          return: workInProgress,
          alternate: null,
          flag: "Placement",
          index,
        };
      }

      if (oldFiber) {
        // 删除
        oldFiber.flag = "Deletion";
        deleteFiber(oldFiber);
      }
    }

    // oldFiber 存在的话，右移
    if (oldFiber) oldFiber = oldFiber.sibling;
    if (index === 0) {
      workInProgress.child = newFiber;
      prevSibling = newFiber;
    } else if (newFiber) {
      prevSibling.sibling = newFiber;
      prevSibling = newFiber;
    }

    index++;
  }
}
