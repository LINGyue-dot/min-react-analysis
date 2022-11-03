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





# React 源码调试





# TODO



11- 03 把 render 和 commit 总结下



* React 自己实现了事件机制来适配跨平台、Vue 不自己实现事件机制如何适配跨平台的？
* hook 为什么不能写在循环、条件判断中



# 参考

https://react.iamkasong.com/