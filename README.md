

# React 原理

> 基于 React@17.0.0 concurrent 并发模式
>
> 注意这里的「并发」只是单线程下的可以交替执行不同任务，而非并行执行任务



# 核心运行分析

分为两个部分 render 阶段（调度和调和）和 commit 阶段（更新渲染）

![img](https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403051454659.awebp)



所有的内部执行由调用模仿 `requestIdleCallback` 的 `workloop` 函数，每隔一段时间执行一次，该函数检查当前全局变量 `nextUnitOfWork` 是否存在 fiber 节点



1. 调用 `performUnitOfWork ` ，初始时候根据 current 树的 root 生成 wip 树的 root ，并将 wip root 设置为 `nextUnitOfWork` 
2. 进入 beginWork 和 completeWork 的 Render 阶段
3. 当 `nextUnitOfWork` 为空，但是 `workInProgressRoot` wip 树存在时候，表明当前新的 fiber 树已构建完成。就进入 `commit` 阶段



## Render 阶段（可被打断）

Render 阶段是生成新的 fiber 树，主要包括 beginWork 以及 completeWork 两个阶段



* beginWork ：`reconcile` 调和
  * 根据当前 `nextUnitOfWork` 指向的 fiber 节点上的 fiber.type 进行不同操作并获取到最新的虚拟 DOM 生成新的 fiber 节点
    * 原生 HTML 不进行操作（不需要生成新的 vdom ）
    * **调用函数组件**（执行 useState 等 hook ）得到新的 vdom 
  * diff 算法对比新旧 vdom ，根据 diff 结果给 fiber 打上 flag/effect tag （如果存在 useEffect 等副作用函数也会被打 effect tag ）
* completeWork ：
  * 根据 fiber.tag 组件类型来执行不同逻辑，更新/创建 DOM ，如果 `fiber.stateNode` 为空，那么就会调用 api 创建 DOM
  * 会收集所有带有 flag/effect tag 的 fiber 到单向链表中即 effectList



### beginWork completeWork 顺序

从根节点开始，向下再向上

<img src="https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403110020435.jpeg" alt="Fiber架构" style="zoom: 25%;" />

```sheel
1. rootFiber beginWork
2. App Fiber beginWork
3. div Fiber beginWork
4. "i am" Fiber beginWork
5. "i am" Fiber completeWork
6. span Fiber beginWork
7. span Fiber completeWork
8. div Fiber completeWork
9. App Fiber completeWork
10. rootFiber completeWork // 没有 KaSong 是因为 React 默认对静态文本节点进行优化了
```





## commit 阶段

commit 阶段就是遍历 effectList 链表并执行对应的逻辑

* before mutation （执行 DOM 操作之前）：遍历 effectList 执行，异步调用 useEffect 
* mountation （执行 DOM 操作） ：遍历 effectList 进行 DOM 操作
* layout （执行 DOM 操作后）：同步调用 useLayoutEffect 





# fiber

1. R16 之前的架构，只有 vdom 树，fiber 树/链表可以看作是 vdom 树的扩展
2. fiber 节点看作是 React 中最小可执行单元
3. fiber 树本质上是 fiber 链表（由于树递归不可中断，所以改为链表可中断）





# hook 有环链表

`mini-react` 中实现的 hook 链表是简略版，源码中的是有环链表

```js
function dispatchAction(queue, action) {
  const update = {
    action,
    next: null,
  };
  if (queue.pending === null) {
    queue.pending = update;
    update.next = update;
  } else {
    update.next = queue.pending.next;
    queue.pending.next = update;
  }
  queue.pending = update;
	// 设置 nextUnitOfWork 为 wip root ，开始调度
  commitRender()
}
```

```typescript
queue.pending = u1 ---> u0 
                ^       |
                |       |
                ---------
queue.peneding = u1
```







# diff 算法

策略大体上和 Vue 一致

1. 只比较同层节点

   * 如果节点的 type 不同，则直接默认不能复用
   * 如果这个节点是函数/类组件的话会调用 `React.memo` 中的回调函数来决定是否向子节点进行 diff

2. type 相同，如果有 key 的话也会加入 key 进行比较（最终目的都是尽可能复用节点）（ React 不会自动添加 key ）

   假如如下

   <img src="https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403061224807.jpg" alt="img" style="zoom:33%;" />

> 使用三个变量来辅助 diff 算法 
>
> - index： 新集合的遍历下标。
>
> - oldIndex：当前节点在老集合中的下标
>
> - maxIndex：在新集合访问过的节点中，其在老集合的最大下标
>
>   ![img](https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403061215032.png)

* 那么此时 diff 过程如下
  - 节点B：此时 maxIndex=0，oldIndex=1；满足 maxIndex< oldIndex，因此B节点不动，此时maxIndex= Math.max(oldIndex, maxIndex)，就是1
  - 节点A：此时maxIndex=1，oldIndex=0；不满足maxIndex< oldIndex，因此A节点进行移动操作，此时maxIndex= Math.max(oldIndex, maxIndex)，还是1
  - 节点D：此时maxIndex=1, oldIndex=3；满足maxIndex< oldIndex，因此D节点不动，此时maxIndex= Math.max(oldIndex, maxIndex)，就是3
  - 节点C：此时maxIndex=3，oldIndex=2；不满足maxIndex< oldIndex，因此C节点进行移动操作，当前已经比较完了



## key 的作用

key 用于 diff 算法（用于同层位置比较），但部分情况下有 key 不一定比无 key 性能好，如下 `innerText` 性能比移动 dom 更好

```html
1.加key
<div key='1'>1</div>             <div key='1'>1</div>     
<div key='2'>2</div>             <div key='3'>3</div>  
<div key='3'>3</div>  ========>  <div key='2'>2</div>  
<div key='4'>4</div>             <div key='5'>5</div>  
<div key='5'>5</div>             <div key='4'>4</div>  
操作：节点2移动至下标为2的位置，节点4移动至下标为4的位置。

2.不加key
<div>1</div>             <div>1</div>     
<div>2</div>             <div>3</div>  
<div>3</div>  ========>  <div>2</div>  
<div>4</div>             <div>5</div>  
<div>5</div>             <div>4</div>  
操作：修改第1个到第5个节点的innerText
```





# 事件合成机制

例如给 div 绑定 `onClick` 事件，但是在浏览器中该 DOM 的 click event 绑定的是 `noop` 

React 会将所有事件按需绑定到 root 根节点上 上，通过冒泡的形式触发 document 上的事件，并不会将事件绑定到真实的 DOM 上。同时一个事件可能有多个事件绑定在 document 上，如 `onChange` ，此时 document 上可能有 `blur` `change` `input` 等事件绑定，如下

<img src="https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403061506861.png" alt="image-20240306150618616" style="zoom: 33%;" />

这么做的原因主要是跨平台的考虑，同时兼容不同浏览器，保证 React 的事件行为是一致的





# batchUpdate 批量更新

默认 R17 会将 setState 合并更新，即多次 setState 最后只会有一次的 setState ，但如果在 setTimeout Promise 或者原生 DOM 事件中就会失效，同时打印内容入下（每次 setState 同时出发 render 阶段和 **commit** 阶段）

```tsx
 const [state, setState] = useState(1);
  useEffect(() => {
    console.log(state, 'render');
  }, [state]);
  return (
    <>
      <div
        onClick={() => {
          setTimeout(() => {
            setState(2); // -->
            console.log(state); // 2
            setState(3);
            console.log(state); // 3
            setState(5);
          });
        }}
      >
        qweqwewq
      </div>
    </>
  );
```

<img src="https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403142329336.png" alt="image-20240314232925267" style="zoom:50%;" />

同时可以使用 `flushSync` 来提高优先级来破坏批量更新

```jsx
  flushSync(() => {
        setCounter((c) => c + 1);
    });
```







## 为什么在 setTimeout 中失效？

因为内部用的是 `isBatchUpdate` 变量来决定当前是否启动合并更新，在函数调用前设置 isBatchUpdate = true ，函数执行完成之后设置 isBatchUpdate = false 

所以在异步函数中由于是 isBatchUpdate = false 所以就无法进行批量更新

R17 中可以使用 unstable_bactchUpdate api 来实现批量更新

> R18 之后对其进行优化，在 setTimeout 中的也进行批量更新



## R18 如何实现异步批量处理

即不用全局变量，而是改为优先级，同一个宏任务/微任务的优先级 lane 是相同的，所以两个 setState 的优先级 lane 是相同的，从而实现批量更新



# React 如何模拟 requestIdleCallback

## 为什么不用 requestIdleCallback

1. 兼容性考虑
2. 只有 20fps 的间隔也就是一秒只会调用 20 次



## 如何模拟的

* 非 DOM 环境：使用 `setTimeout(()=>{})` 进行执行
* DOM 环境：使用 `requestAniamtion` `setTimeout` `postmessage` 进行模拟行为

> 详情的可见 [你不知道的 requestIdleCallback](https://github.com/MuYunyun/blog/blob/main/React/%E4%BD%A0%E4%B8%8D%E7%9F%A5%E9%81%93%E7%9A%84requestIdleCallback.md)





# R18 变化

## useEffect 执行两次

`strictMode` `dev` 下 `useEffect` 默认执行两次

1. React 模拟立刻卸载和重新挂载组件
2. 为了让开发者尽可能写不影响应用正常运行的回调函数（铺垫未来新功能）



> strictMode 辅助 dev ，会提示一些废弃 api 等



## 根据 api 调用情况来决定是否并发更新

> R17 中是通过内部全局变量进行统一标记

<img src="https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403061524665.png" alt="image-20240306152427326" style="zoom: 25%;" />



## 多了几个并发模式的 hook



### useDeferredValue

```typescript
import React, { useState, useEffect, useDeferredValue } from 'react';

const App: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    setList(new Array(10000).fill(null));
  }, []);
  // 使用了并发特性，开启并发更新
  const deferredList = useDeferredValue(list);
  return (
    <>
      {deferredList.map((_, i) => (
        <div key={i}>{i}</div>
      ))}
    </>
  );
};

export default App;
```

<img src="https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403061528149.awebp" alt="QQ截图20220505072516.jpg" style="zoom:67%;" />

普通情况下（非并发）

```typescript
import React, { useState, useEffect } from 'react';

const App: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    setList(new Array(10000).fill(null));
  }, []);
  return (
    <>
      {list.map((_, i) => (
        <div key={i}>{i}</div>
      ))}
    </>
  );
};

export default App;
```

![999.jpg](https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403061528647.awebp)





# 使用

## HOC

改造/强化子组件，例如 icon 给 input 框架上，就把 icon 的逻辑从子组件剥离出

# 参考

[手把手教你实现史上功能最丰富的简易版 React](ttps://zlxiang.com/react/%E6%BA%90%E7%A0%81/%F0%9F%9A%80%20%E4%B8%87%E5%AD%97%E5%A5%BD%E6%96%87%20%E2%80%94%E2%80%94%20%E6%89%8B%E6%8A%8A%E6%89%8B%E6%95%99%E4%BD%A0%E5%AE%9E%E7%8E%B0%E5%8F%B2%E4%B8%8A%E5%8A%9F%E8%83%BD%E6%9C%80%E4%B8%B0%E5%AF%8C%E7%9A%84%E7%AE%80%E6%98%93%E7%89%88%20react.html#%E5%89%8D%E8%A8%80)

[React 技术揭秘](https://react.iamkasong.com/#%E5%AF%BC%E5%AD%A6%E8%A7%86%E9%A2%91)

[你不知道的 requestIdleCallback](https://github.com/MuYunyun/blog/blob/main/React/%E4%BD%A0%E4%B8%8D%E7%9F%A5%E9%81%93%E7%9A%84requestIdleCallback.md)

[聊一聊Diff算法（React、Vue2.x、Vue3.x）](https://zhuanlan.zhihu.com/p/149972619)

[React 的 Concurrent Mode 是否有过度设计的成分？](https://www.zhihu.com/question/434791954)

[React18 新特性](https://juejin.cn/post/7094037148088664078)