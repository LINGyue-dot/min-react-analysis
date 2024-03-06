

# React 原理

> 基于 React@17.0.0 concurrent 并发模式
>
> 注意这里的「并发」只是单线程下的可以交替执行不同任务，而非并行执行任务



# 核心运行分析

分为两个部分 render 阶段（调度和调和）和 commit 阶段（更新渲染）

![img](https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403051454659.awebp)



所有的内部执行由调用模仿 `requestIdleCallback` 的 `workloop` 函数，每隔一段时间执行一次，该函数检查当前全局变量 `nextUnitOfWork` 是否存在 fiber 节点

> 1 2 属于 render 阶段，生成 fiber 树并打上 flag 

1. 调用 `performUnitOfWork ` ，根据 `nextUniofWork` fiber 节点上的虚拟 DOM `type` 进行不同的处理

   1. 原生 HTML 类型，如果需要则创建真实 DOM （ `fiber.stateNode` 为空）
   2. 函数组件类型，执行该函数，得到返回值

   > 处理完该 fiber 之后，会按照如图顺序执行<img src="https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403061112759.png" alt="image-20221104002015500" style="zoom:20%;" />

2. 调和 `reconcile` 该 fiber 节点，生成新的 fiber 树

   *  diff 算法对比该 fiber 为根的 fiber 树对应的旧 fiber 树（ `fiber.alternate` 进行获取旧 fiber 节点）
   * 根据 diff 结果，给 fiber 打上 flag 标志位如 `Placement 添加` `Deletion 删除` `Update 更新` 等副作用标志

3. 当 `nextUnitOfWork` 为空，但是 `workInProgressRoot` wip 树存在时候，表明当前新的 fiber 树已构建完成。就进入 `commit` 阶段，即按照 wip 树修改真实 DOM ，执行如 `appendChild` `insertBefore` `removeChild`  或是更新 DOM 节点的属性等。该阶段不可中断









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

2. type 相同，如果有 key 的话也会加入 key 进行比较（最终目的都是尽可能复用节点）

   假如如下

   ![img](https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403061224807.jpg)

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

key 用于 diff 算法，但部分情况下有 key 不一定比无 key 性能好，如下 `innerText` 性能比移动 dom 更好

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





# 参考

[手把手教你实现史上功能最丰富的简易版 React](ttps://zlxiang.com/react/%E6%BA%90%E7%A0%81/%F0%9F%9A%80%20%E4%B8%87%E5%AD%97%E5%A5%BD%E6%96%87%20%E2%80%94%E2%80%94%20%E6%89%8B%E6%8A%8A%E6%89%8B%E6%95%99%E4%BD%A0%E5%AE%9E%E7%8E%B0%E5%8F%B2%E4%B8%8A%E5%8A%9F%E8%83%BD%E6%9C%80%E4%B8%B0%E5%AF%8C%E7%9A%84%E7%AE%80%E6%98%93%E7%89%88%20react.html#%E5%89%8D%E8%A8%80)

[React 技术揭秘](https://react.iamkasong.com/#%E5%AF%BC%E5%AD%A6%E8%A7%86%E9%A2%91)

[你不知道的 requestIdleCallback](https://github.com/MuYunyun/blog/blob/main/React/%E4%BD%A0%E4%B8%8D%E7%9F%A5%E9%81%93%E7%9A%84requestIdleCallback.md)

[聊一聊Diff算法（React、Vue2.x、Vue3.x）](https://zhuanlan.zhihu.com/p/149972619)

[React 的 Concurrent Mode 是否有过度设计的成分？](https://www.zhihu.com/question/434791954)

[React18 新特性](https://juejin.cn/post/7094037148088664078)