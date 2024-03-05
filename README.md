

# React 原理

> debug 框架 -> mini-useState -> mini-react



路线

1. 把基本源码解析的文章看一些
2. 实现 mini-react  https://zlxiang.com/react/%E6%BA%90%E7%A0%81/%F0%9F%9A%80%20%E4%B8%87%E5%AD%97%E5%A5%BD%E6%96%87%20%E2%80%94%E2%80%94%20%E6%89%8B%E6%8A%8A%E6%89%8B%E6%95%99%E4%BD%A0%E5%AE%9E%E7%8E%B0%E5%8F%B2%E4%B8%8A%E5%8A%9F%E8%83%BD%E6%9C%80%E4%B8%B0%E5%AF%8C%E7%9A%84%E7%AE%80%E6%98%93%E7%89%88%20react.html#%E5%AE%9E%E7%8E%B0-usestate



# 核心关注的几个问题

* props 变化如何触发子组件更新
* 事件合成机制是怎么做的？
* hooks useState、useContext 、useLayoutEffect 、useEffect 等
* 异步可中断的话，会不会使得 state 更新/ hook 执行，但是此时视图还是旧的（因为当前全部 DOM 还没有构建完成）





## 简易 React 抽象功能



### 



# 源码分析

分为两个部分 render 阶段（调度和调和）和 commit 阶段（更新渲染）

<img src="https://typora-1300781048.cos.ap-beijing.myqcloud.com/img/202403051454659.awebp" alt="img" style="zoom:50%;" />





# R18/R19 的变化







# 参考

[手把手教你实现史上功能最丰富的简易版](ttps://zlxiang.com/react/%E6%BA%90%E7%A0%81/%F0%9F%9A%80%20%E4%B8%87%E5%AD%97%E5%A5%BD%E6%96%87%20%E2%80%94%E2%80%94%20%E6%89%8B%E6%8A%8A%E6%89%8B%E6%95%99%E4%BD%A0%E5%AE%9E%E7%8E%B0%E5%8F%B2%E4%B8%8A%E5%8A%9F%E8%83%BD%E6%9C%80%E4%B8%B0%E5%AF%8C%E7%9A%84%E7%AE%80%E6%98%93%E7%89%88%20react.html#%E5%89%8D%E8%A8%80)

