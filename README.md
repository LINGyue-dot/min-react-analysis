# React 部分能力实现





## min-useState

### 目标流程分析

```jsx
function App() {
  const [state, setState] = useState(0);

  return <p onClick={() => setState(state => state + 1)}>{state}</p>;
}
```

`useState` 使用上大致经过2个流程

1. mounted 初始化时候，即 `ReactDOM.render` 初始化时候 `mounted` 为 `initialValue` 
2. update 更新时候，触发 `setState` 导致的 `render` 函数的重新执行，将 state 值更新为 `state+1` 





### update

每个 `setState ` 都会去调用 `dispatchAction` 在该函数中产生一个 `update` 。当存在多个 `setState ` 时候多个 `update` 会连接成 **环状链表** 

简化代码如下：

```js
function dispatchAction(queue, action) {
  const update = {
    action,
    next: null,
  }
  if (queue.pending === null) {
    update.next = update
  } else {
    update.next = queue.pending.next
    queue.pending.next = update
  }
  queue.pending = update
  // React 开始调度更新
  schedule()
}
```

执行第一次 `setState` 时候，形成的链表

```js
queue.pending = u0 ----->
                ^       |
                |       |
                ---------
```

执行第二个 `setState` 时候，形成的链表如下

```js
queue.pending = u1 ---> u0   
                ^       |
                |       |
                ---------
```

> 这样形成一个倒序链表，方便遍历以及插入





### 状态存储

class component 的状态是存储在类实例上，function component 的状态是存储在 fiber 节点的 `memorizedState` 上

```js
// App 组件的 fiber 节点
const fiber ={
  // 对应 hook 链表
	memorizedState: null,
  stateNode: App
}
```

`memorizedState` 上是 hook 实例连接而成的单向无环链表，一个 `useState` 对应一个 hook 对象

如下：

```js
const [num1,setNum1] = useState(0) // hook1 
const [num2,setNum2] = useState(0) // hook2
```

```js
fiber.memorizedState = hook1 -> hook2
```



Hook 对象实例大致如下：

```js
hook = {
  // 如上的 update 链表
  queue:{
    pending: null
  },
  // hook 对应的 state
  memorizedState: initialValue,
  // 下一个 hook 对象
  next: null 
}
```







### schedule

每次 `schedule` 时候都会重置 workInProgressHook 指针

```js
function schedule() {
  // 更新时候重置 workInProgressHook 指针为 fiber 保存的第一个 hook
  workInProgressHook = fiber.memorizeState
  // 触发 render
  fiber.stateNode()
  //
  isMounted = false
}
```

通过 `workInProgressHook` 指针指向当前正在工作的 hook，在执行 `render` 函数的  `const [state,setState] = useState()` 时候就会进行移动 `workInProgressHook` 指针



### useState

```js
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
      const action = firstUpdate.action;
      baseState = action(baseState);
      firstUpdate = firstUpdate.next;
    } while (firstUpdate !== hook.queue.pending.next);
    hook.queue.pending = null;
  }

  hook.memorizeState = baseState;

  return [baseState, dispatchAction.bind(null, hook.queue)];
}

```







### 总结

如下为例子

```jsx
const App = () => {
  const [name, setName] = useState()
  const [age, setAge] = useState()
  return (
    <div
      onClick={() => {
        setName('12')
        setName('zxczx')
      }}
    ></div>
  )
}
```

#### 初始化

初始化时候会先构造 fiber 上的 memorizeState hook 链表

* 执行完第二行：

  ```js
  fiber.memorizeState = NameHook 
  WorkInProgressHook = NameHook
  ```

* 执行完第三行

  ```js
  fiber.memorizeState = NameHook -> AgeHook
  WorkInProgressHook = AgeHook
  ```

此时二者的 queue.pending 链表都为空



#### 更新

更新即点击了 div ，调用了 `setName` 。调用了两次，那么会给 `NameHook` 添加上

```js
NameHook.queue.pending = update2 -> update1
```

在实际 React 中会去具体消费 update 对象，可能存在批量更新，从而计算出 state 





### TODO

* update 对象实例的 action 具体是什么？
* hook 为什么不能写在条件/循环语句中
* queue.pending 在哪？
  * 在对应的 hook 对象实例上
* memorizedState 的初始化以及更新区分（参考 面试.md 中的 React 章节）





# React 源码

## JSX 到 fiber

JSX 和 Vue template 一样都会经过 babel 将其转义为一个个函数，React 中就是转化为 `React.createElement` 

即 JSX 都会通过 `createElement` 转为一个个 `Element` 对象，该结构大致为

```js
  const element = {
    // 标记这是个 Element 对象
    $$typeof: REACT_ELEMENT_TYPE,
    // type 可能为类组件、函数组件、div 等原生 html
    // 类组件以及函数组件 type 就是一个函数
    type: type,
    key: key,
    ref: ref,
    props: props,
    _owner: owner,
  };
```

区分类组件还是函数组件是利用原型链上的 `isReactComponent` 

```js
ClassComponent.prototype.isReactComponent = {}
```



fiber 节点就是根据 `Element` 对象来进行生成的，并且多了

* 组件更新的优先级
* 组件的 state
* 组件的 `rerender` 标志
* ...



fiber 的几个特殊字段

```js
{
  memoizedProps // 父组件的 prop
  stateNode // DOM 实例
  
}
```

### fiberRoot rootFiber

- `fiberRoot`：首次构建应用， 创建一个 fiberRoot ，作为整个 React 应用的根基。

- `rootFiber`： 如下通过 ReactDOM.render 渲染出来的，如上 Index 可以作为一个 rootFiber。一个 React 应用可以有多 ReactDOM.render 创建的 rootFiber ，但是只能有一个 fiberRoot（应用根节点）。

![img](https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202211051048045)

> 每次调和都从 rootFiber 开始





## 初始化/更新

整个的初始化/更新可以分为 `render` `commit` 阶段，本质上就是一个构建 wip 树以及更新的过程

**全部操作都发生在 wip 树上**

* render 阶段（前序遍历并回溯的过程）
  * beginWork（前序遍历）：生成 wip fiber 树并 diff 给对应的 fiber 打上 effect tag
  * completeWork（回溯）
* commit 阶段



### render beginWork 

![img](https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202211032346442.png)

>  current 是 current 树上对应的 fiber 节点（即上一次更新的 fiber 节点）

根据 current 的值，来判断是 update 还是 mount



#### mount 初始化

根据 fiber.tag 不同，来走不同的创建子 fiber 的逻辑



#### update 更新

会根据 props 和 type 与 current 的一致来决定是否复用，如果一致就复用

* 复用的话就会进入 diff 算法来生成带有 effectTag 的子 fiber 节点
* 不复用的话 **TODO**



> effectTag 为 Placement 就是插入

最后挂载到 rootFiber 上

```js
                       nextEffect         nextEffect
rootFiber.firstEffect -----------> fiber -----------> fiber
```



**执行顺序**

<img src="https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202211040020555.png" alt="image-20221104002015500" style="zoom:50%;" />



### render completeWork

<img src="https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202211032345300.png" alt="img" style="zoom:50%;" />



同样是根据 current 来进行分辨 update 还是 mount

* mount ：根据 beginWork 的 fiber 树以及 effectList 来生成一个完整的离屏的 DOM 

* update ：存在 DOM 不需要生成了，主要处理 props 

  * onClick 、onChange 等回调函数的注册
  * 处理 style 、prop
  * 处理 children prop

  在 `updateHostComponent` 中，父组件处理完传递给该 `HostComponent` 的 prop 之后，会将 

被处理完的`props`会被赋值给`workInProgress.updateQueue`，并最终会在`commit阶段`被渲染在页面上。 ？？？ **什么意思，wip 此时指向谁？这个 props**





## 初始化全流程



1. JSX 构建生成 element 树
2. element 树构建生成 fiber 树





render 阶段

* beginWork 阶段，mounted 初始化的话就生成新 fiber 节点，update 的话就生成带 effectTag 的 Fiber 节点





## 更新全流程







# Debug

* jsxDEV
* ReactElement 生成 Element 对象

是从叶节点向上生成的？？TODO



* react/packages/react-dom/src/client/ReactDOMLegacy.js render 函数
* render --》 构建出 fiberRoot

![image-20221105115436942](https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202211051154293.png)



* updateContainer 里面会创建 update 对象，并利用 enqueueUpdate 进行

![image-20221105124250840](https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202211051242092.png)



**update 对象挂在哪？** 在 fiber 上，那 fiber.memorizeState 的 hook 链表上的 hook 对象上的 pending 是什么？

`react/packages/react-reconciler/src/ReactUpdateQueue.old.js`  enqueueUpdate



此时完成了 fiberRoot 的构建，current 树还是只有一个 rootFiber 节点



leygcy 入口 `react/packages/react-reconciler/src/ReactFiberWorkLoop.old.js`  performSyncWorkOnRoot







# TODO



11- 03 把 render 和 commit 总结下



* completeWork 的处理 props 
* 什么时候执行的 render 函数
* React 自己实现了事件机制来适配跨平台、Vue 不自己实现事件机制如何适配跨平台的？
* hook 为什么不能写在循环、条件判断中
* 为什么要有 fiber ，目前 legcy 模式下又没有异步可中断，是用来过渡吗？最终服务于 concurrent 模式吗？

* useRef

# 参考

https://react.iamkasong.com/

https://juejin.cn/book/7070324244772716556/section/7137083930078871589