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



### fiber 的几个特殊字段

```js
{
  memoizedProps // 父组件的 prop
  stateNode // DOM 实例
  memoizedState // state 值
  
}
```

### fiberRoot rootFiber

- `fiberRoot`：首次构建应用， 创建一个 fiberRoot ，作为整个 React 应用的根基。

- `rootFiber`： 如下通过 ReactDOM.render 渲染出来的，如上 Index 可以作为一个 rootFiber。一个 React 应用可以有多 ReactDOM.render 创建的 rootFiber ，但是只能有一个 fiberRoot（应用根节点）。

![img](https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202211051048045)

> 每次调和都从 rootFiber 开始





### 双缓存树

`workInProgress fiber树`: 即将调和渲染的 `fiber` 树。再一次新的组件更新过程中，会从`current`复制一份作为`workInProgress`,更新完毕后，将当前的`workInProgress`树赋值给`current`树。





## 几个 fiber 变量

### 几个易解释变量

```js
{
	memoizedProps // 父组件的 prop
  stateNode // DOM 实例
}
```



### mode

即 legcy blocking concurrent 三种模式

legcy 为同步、concurrent 为异步可中断模式







### Update

```js
const update: Update<*> = {
  eventTime,
  // 优先级
  lane,
  suspenseConfig,
  // 更新的类型，包括UpdateState | ReplaceState | ForceUpdate | CaptureUpdate
  tag: UpdateState,
  // 更新挂载的数据，不同类型组件挂载的数据不同。对于ClassComponent，payload为this.setState的第一个传参。对于HostRoot，payload为ReactDOM.render的第一个传参。
  payload: null,
  // 更新的回调函数
  callback: null,

  next: null,
};
```







### updateQueue

有三种类型：

1. HostComponent： 

   https://react.iamkasong.com/process/completeWork.html#update%E6%97%B6

   https://codesandbox.io/s/updatepayload-pzw36?file=/src/index.js

   数组形式，偶数是 key 奇数是 value

2. ClassComponent 以及 HostComponent ( ReactDOM.render )

   ```js
   const queue: UpdateQueue<State> = {
       // 上一次正常执行最后的 state 见 面试.md/React/任务插队如何保证最终结果正确
       baseState: fiber.memoizedState,
       // 前一次更新中被跳过的 Update （优先级相关）见 面试.md/React/任务插队如何保证最终结果正确
       firstBaseUpdate: null,
       lastBaseUpdate: null,
       shared: {
         // Update 对象单向链表
         pending: null,
       },
       // 数组。保存update.callback !== null的Update。
       effects: null,
     };
   ```

3. function Component 放的是 useEffect 的 effect 对象





*class 组件 Fiber 节点上的多个 Update 会组成链表并被包含在 fiber.updateQueue 中。 函数组件则是存储 useEffect 的 effect 的环状链表。*



### memoizedState

FunctionComponent 对应 fiber 保存的 hooks 链表，注意是正序的

https://zhuanlan.zhihu.com/p/346696902





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





### diff

根据 key 和 type 来决定能否复用



## 更新/初始化概述

（根据 current 树复制一份生成 wip 树）

Begin work -> 根据 wip.tag 调用 `renderWithHooks` 





### renderWithHooks

1. 清空 wip 树的 `memoizedState` 和 `updateQueue` ，因为接下来要把新的 hooks 信息挂载到这2个属性上
2. 

```js
export function renderWithHooks(
  current,
  workInProgress,
  Component,
  props,
  secondArg,
  nextRenderExpirationTime,
) {
  renderExpirationTime = nextRenderExpirationTime;
  currentlyRenderingFiber = workInProgress;

  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.expirationTime = NoWork;
	// 根据 current 树以及 current.memoizedState 来进行判断是第一次渲染还是更新
  ReactCurrentDispatcher.current =
      current === null || current.memoizedState === null
        ? HooksDispatcherOnMount
        : HooksDispatcherOnUpdate;

  // 执行函数组件
  let children = Component(props, secondArg);

  if (workInProgress.expirationTime === renderExpirationTime) { 
       // ....这里的逻辑我们先放一放
  }
	// 更改 disptach 对象，保证只有在函数组件中调用才能成功
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;

  renderExpirationTime = NoWork;
  currentlyRenderingFiber = null;

  currentHook = null
  workInProgressHook = null;

  didScheduleRenderPhaseUpdate = false;

  return children;
}
```















## hook 原理

hook 在 mount 和 update 会调用不同的函数，从不同的 disptach 对象取出来

> 同样是根据 fiber.current === null 来进行区分是 mount 还是 update

```js
// mount时的Dispatcher
const HooksDispatcherOnMount: Dispatcher = {
  useCallback: mountCallback,
  useContext: readContext,
  useEffect: mountEffect,
  useImperativeHandle: mountImperativeHandle,
  useLayoutEffect: mountLayoutEffect,
  useMemo: mountMemo,
  useReducer: mountReducer,
  useRef: mountRef,
  useState: mountState,
  // ...省略
};

// update时的Dispatcher
const HooksDispatcherOnUpdate: Dispatcher = {
  useCallback: updateCallback,
  useContext: readContext,
  useEffect: updateEffect,
  useImperativeHandle: updateImperativeHandle,
  useLayoutEffect: updateLayoutEffect,
  useMemo: updateMemo,
  useReducer: updateReducer,
  useRef: updateRef,
  useState: updateState,
  // ...省略
};
```

为了避免出现 hook 互相嵌套的现象

 `src/react/v17/react-reconciler/src/ReactFiberHooks.new.js` 

```js
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;
```

后续内部调用 hook 就会调用报错的 Dispatch



### hook 对象

```js
const hook: Hook = {
  // !!! 与 fiber.memoizedState 不同，这里是存储
  memoizedState: null,
	
  // 与 https://react.iamkasong.com/state/update.html#updatequeue UpdateQueue 基本一致
  // 用来存储高优任务先执行的最终状态的正确性
  baseState: null,
  baseQueue: null,
  queue:{
    // 保存 dispatchAction.bind() ，与 min-useState 一致
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: (initialState: any),
    // 保存 update 对象
    pending: null
  }

  next: null,
};
```

`hook.memoizedState` 与 `fiber.memoizedState` 不同，这里 `hook.memoizedState` 存储的是 hook 相关的值

* useState 是 state 的值
* useReducer 是存 state 值
* useEffect 存 `useEffect 回调函数` `依赖项` 等的链表数据结构 `effect` ，同时这个 `effect` 链表也会被保存到 `fiber.updateQueue` 
* useRef 存的是对象，例如 `useRef(1)` => `{current:1}` 
* useMemo 存的是 `callback() 返回的值` `dep` 
* useCallback 存的是 `callback` `dep` ，与 useMemo 不同的是存的是函数
* useContext 没有 memoizedState





### Hook 对象生成 mountWorkInProgressHook

Hook 的生成都是通过 `mountWorkInProgressHook` 

```js
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null,
  };

  if (workInProgressHook === null) {
    // This is the first hook in the list
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // Append to the end of the list
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
```





### hook 对象更新 updateWorkInProgressHook

根据 current 树上的 `memoizedState` （旧 hook 链表）来生成新的 `memoizedState` 

```js

function updateWorkInProgressHook() {
  let nextCurrentHook;
  if (currentHook === null) {  /* 如果 currentHook = null 证明它是第一个hooks */
    const current = currentlyRenderingFiber.alternate;
    if (current !== null) {
      nextCurrentHook = current.memoizedState;
    } else {
      nextCurrentHook = null;
    }
  } else { /* 不是第一个hooks，那么指向下一个 hooks */
    nextCurrentHook = currentHook.next;
  }
  let nextWorkInProgressHook
  if (workInProgressHook === null) {  //第一次执行hooks
    nextWorkInProgressHook = currentlyRenderingFiber.memoizedState;
  } else { 
    nextWorkInProgressHook = workInProgressHook.next;
  }

  if (nextWorkInProgressHook !== null) { 
      /* 这个情况说明 renderWithHooks 执行 过程发生多次函数组件的执行 ，我们暂时先不考虑 */
    workInProgressHook = nextWorkInProgressHook;
    nextWorkInProgressHook = workInProgressHook.next;
    currentHook = nextCurrentHook;
  } else {
    invariant(
      nextCurrentHook !== null,
      'Rendered more hooks than during the previous render.',
    );
    currentHook = nextCurrentHook;
    const newHook = { //创建一个新的hook
      memoizedState: currentHook.memoizedState,
      baseState: currentHook.baseState,
      baseQueue: currentHook.baseQueue,
      queue: currentHook.queue,
      next: null,
    };
    if (workInProgressHook === null) { // 如果是第一个hooks
      currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
    } else { // 重新更新 hook
      workInProgressHook = workInProgressHook.next = newHook;
    }
  }
  return workInProgressHook;
}
```



### useState

#### 初始化



* 初始化 hook 对象，并形成一个 hook 链表，挂载 wip **fiber.memoizedState** 上

  ```js
  const hook: Hook = {
    // !!! 与 fiber.memoizedState 不同，这里是存储
    memoizedState: null,
  	
    // 与 https://react.iamkasong.com/state/update.html#updatequeue UpdateQueue 基本一致
    // 用来存储高优任务先执行的最终状态的正确性
    baseState: null,
    baseQueue: null,
    queue:{
      // 保存 dispatchAction.bind() ，与 min-useState 一致
      dispatch: null,
      lastRenderedReducer: basicStateReducer,
      lastRenderedState: (initialState: any),
      // 保存 update 对象，
      pending: null
    }
    next: null,
  };
  ```

  basiscStateReducer 函数，`action` 就是 `setState` 传入的参数

  ```js
  function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
    return typeof action === 'function' ? action(state) : action;
  }
  ```

* hook.memoizedState 赋值 initialState







#### 调用 setState

本质调用的是 `dispatchAction` 

* 申请优先级，legcy 模式下都是同步
* 创建 Update 对象，会挂在 hook.queue.pending 上
* 根据当前的阶段不同进行不同逻辑
  * 在 render 阶段：打上标志位 `didScheduleRenderPhaseUpdateDuringThisPass` 并开始调度
  * 不在 render 阶段：调度 `hook.lastRenderedReducer` 计算出新的 state ，并进行浅比较，如果相同的话就 return ，不同的话就对 fiber 进行调度 `scheduleUpdateOnFiber` 



> useReducer 与 useState 只有在 mount 时候 lastRenderedReducer 不同，其余/更新一摸一样



#### 避免嵌套调用 hook

在计算新 state 之前将 `ReactCurrentDispatcher.current` 置为错误的 dispatch ，后续如果出现嵌套声明 hook 就会调用错误的 dispatch ，然后在执行完之后再恢复

```js
      // dispatchAction
			const lastRenderedReducer = queue.lastRenderedReducer;
      if (lastRenderedReducer !== null) {
        let prevDispatcher;
        if (__DEV__) {
          // 
          prevDispatcher = ReactCurrentDispatcher.current;
          ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnUpdateInDEV;
        }
        try {
          const currentState: S = (queue.lastRenderedState: any);
          const eagerState = lastRenderedReducer(currentState, action);
          update.eagerReducer = lastRenderedReducer;
          update.eagerState = eagerState;
          // 浅比较，新 state 与旧  state 
          if (is(eagerState, currentState)) {
            return;
          }
        } catch (error) {
          // Suppress the error. It will throw again in the render phase.
        } finally {
          if (__DEV__) {
            // 恢复
            ReactCurrentDispatcher.current = prevDispatcher;
          }
        }
```



### useEffect

#### 初始化

所有的 hook 都一样会创建 Hook 对象，hook.memoizedState 等于 `pushEffect` 返回值

`pushEffect` 会生成一个 effect 对象添加到 `workInProgress.updateQueue`  

```js
function pushEffect(tag, create, destroy, deps) {
  const effect = {
    tag,
    create,
    destroy,
    deps,
    next: null,
  };
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue
  if (componentUpdateQueue === null) { // 第一个 hook / mount 
    componentUpdateQueue = {  lastEffect: null  }
    currentlyRenderingFiber.updateQueue = componentUpdateQueue
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {  // 存在多个effect
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}
```

这里最后形成的链表是倒序的

```js
useEffect(()=>{
    console.log(1)
},[ props.a ])
useEffect(()=>{
    console.log(2)
},[])
useEffect(()=>{
    console.log(3)
},[])
```

<img src="https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202211062250086.jpeg" alt="图片" style="zoom:50%;" />



#### 二次声明/更新

生成一个新 hook 对象以及 effect 对象，如果 deps 发生变化的话将 effect 对象放到 `hook.memoizedState` ，最后会在 `commit` 阶段，根据 tag 来决定是否执行 `create` 

```js
function updateEffectImpl(fiberEffectTag, hookEffectTag, create, deps): void {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy = undefined;

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState;
    destroy = prevEffect.destroy;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        pushEffect(hookEffectTag, create, destroy, nextDeps);
        return;
      }
    }
  }

  currentlyRenderingFiber.effectTag |= fiberEffectTag;

  hook.memoizedState = pushEffect(
    HookHasEffect | hookEffectTag,
    create,
    destroy,
    nextDeps,
  );
}
```







### useMemo / useCallback



#### 初始化

生成一个 hook 对象，然后将值和 deps 缓存在 `hook.memoizedState` 上

```js

function mountMemo(nextCreate,deps){
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
```

#### 更新

* deps 如果没有变化的话，直接返回
* deps 发生变化的话，就执行 useMemo 函数，并赋值给 `hook.memoizedState`

```js
function updateMemo(
  nextCreate,
  deps,
) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps; // 新的 deps 值
  const prevState = hook.memoizedState; 
  if (prevState !== null) {
    if (nextDeps !== null) {
      const prevDeps = prevState[1]; // 之前保存的 deps 值
      if (areHookInputsEqual(nextDeps, prevDeps)) { //判断两次 deps 值
        return prevState[0];
      }
    }
  }
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
```





### useRef

#### 初始化

申请一个 hook 对象，然后用一个对象存储起来

```js
function mountRef(initialValue) {
  const hook = mountWorkInProgressHook();
  const ref = {current: initialValue};
  hook.memoizedState = ref;
  return ref;
}
```



#### 更新

返回缓存的值

```js
function updateRef(initialValue){
  const hook = updateWorkInProgressHook()
  return hook.memoizedState
}
```









## 优先级

如果选择了 legcy 模式，那么申请到所有的 Lane ( `requestUpdateLane` )都是同步 





# 几个变量

* workInProgressHook 链表指针
* currentlyRenderingFiber 即 workInProgress ，指向 wip fiber 节点 



# TODO



11- 03 把 render 和 commit 总结下









* completeWork 的处理 props 
* effectList 的顺序
* 什么时候执行的 render 函数
* React 自己实现了事件机制来适配跨平台、Vue 不自己实现事件机制如何适配跨平台的？
* hook 为什么不能写在循环、条件判断中
* 为什么要有 fiber ，目前 legcy 模式下又没有异步可中断，是用来过渡吗？最终服务于 concurrent 模式吗？

* useRef

# 参考

https://react.iamkasong.com/

https://juejin.cn/book/7070324244772716556/section/7137083930078871589

https://mp.weixin.qq.com/s?src=11&timestamp=1667731065&ver=4150&signature=sDeCXgFElF0rfs2Zx5fYb6*fJvfeAlWbJVpyRNDgLsX9TeS28zhXyZKAeM-661eMrkPVZZ1SygJBvSQ5tJz6JiH8wvdjX1iIMy*rQQcW9hDwKbb1vSGYhIwnaCw5K2Y6&new=1