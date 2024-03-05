import { createRoot } from "./fiber";

function render(element, container) {
  const dom = renderDOM(element);
  container.appendChild(dom);
  createRoot(element, container);
}

/**
 * 根据 React.Element/ 虚拟 DOM 转换为真实的 DOM，只构造出当前的 element 对应的节点，而不去考虑子节点或数组节点的情况
 * 1. 普通节点
 * 2. 是具有 type 的节点
 */
function renderDOM(element) {
  // 这里可以观测下 JSX 的 element 对象是什么样的
  //   console.log(element); // 见文件底部注释
  let dom;
  if (!element && element !== 0) return null;
  // 文本节点
  if (typeof element === "string") {
    dom = document.createTextNode(element);
  }
  if (typeof element === "number") {
    dom = document.createTextNode(String(element));
  }
  // array 数组的情况放在 fiber 中去做
  //   if (Array.isArray(element)) {
  //     dom = document.createDocumentFragment();
  //     for (let item of element) {
  //       const child = renderDOM(item);
  //       if (child) dom.appendChild(child);
  //     }
  //   }
  if (dom) return dom;

  // 是对象
  const { type, props } = element;
  if (typeof type === "string") {
    // 普通节点
    dom = document.createElement(type);
  }
  // function 的情况也放在 fiber 里面去做
  //   else if (typeof type === "function") {
  //     // 函数节点，执行获取 jsx 对象
  //     const jsx = type(props);
  //     dom = renderDOM(jsx);
  //   }
  // children 递归的情况也放在 fiber 里面去做
  //   if (props && props.children) {
  //     const childrenDom = renderDOM(props.children);
  //     if (childrenDom) dom.appendChild(childrenDom);
  //   }
  updateAttributes(dom, props);
  return dom;
}

function updateAttributes(dom, attributes) {
  if (!attributes) return;
  Object.keys(attributes).forEach((key) => {
    if (key.startsWith("on")) {
      // 事件处理
      const eventName = key.slice(2).toLocaleLowerCase();
      dom.addEventListener(eventName, attributes[key]);
    } else if (key === "className") {
      const classes = attributes[key].split(" ");
      classes.forEach((classKey) => {
        dom.classList.add(classKey);
      });
    }
  });
}

const ReactDOM = {
  render,
  renderDOM,
};

export default ReactDOM;

/**
 * element => {"type":"div","key":null,"ref":null,"props":{"className":"deep1-box","children":[{"key":null,"ref":null,"props":{"value":100},"_owner":null,"_store":{}},{"type":"div","key":null,"ref":null,"props":{"className":"deep2-box-1","children":[{"type":"a","key":null,"ref":null,"props":{"href":"https://github.com/zh-lx/mini-react","children":"mini react link"},"_owner":null,"_store":{}},{"type":"p","key":null,"ref":null,"props":{"style":{"color":"red"},"children":" this is a red p"},"_owner":null,"_store":{}},{"type":"div","key":null,"ref":null,"props":{"className":"deep3-box","children":[{"type":"div","key":null,"ref":null,"props":{"children":"condition true"},"_owner":null,"_store":{}},false,{"type":"input","key":null,"ref":null,"props":{"type":"button","value":"say hello"},"_owner":null,"_store":{}}]},"_owner":null,"_store":{}}]},"_owner":null,"_store":{}},{"type":"div","key":null,"ref":null,"props":{"className":"deep2-box-2","children":[{"type":"li","key":"item1","ref":null,"props":{"children":"item1"},"_owner":null,"_store":{}},{"type":"li","key":"item2","ref":null,"props":{"children":"item2"},"_owner":null,"_store":{}},{"type":"li","key":"item3","ref":null,"props":{"children":"item3"},"_owner":null,"_store":{}}]},"_owner":null,"_store":{}}]},"_owner":null,"_store":{}}
 */
