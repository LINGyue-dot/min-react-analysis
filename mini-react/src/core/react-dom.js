import { createRoot } from "./fiber";

function render(element, container) {
  const dom = renderDOM(element);
  container.appendChild(dom);
  createRoot(element, container);
}

/**
 * 根据 React.Element/ 虚拟 DOM 转换为真实的 DOM，只构造出当前的 element 对应的节点，而不去考虑子节点或数组节点的情况（在 fiber 构建/更新过程中做）
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
  } else if (typeof type === "function") {
    // 创建个空白占位
    dom = document.createDocumentFragment();
  }
  updateAttributes(dom, props);
  return dom;
}

export function updateAttributes(dom, attributes, oldAttributes) {
  if (oldAttributes) {
    // 有旧属性，移除旧属性
    Object.keys(oldAttributes).forEach((key) => {
      if (key.startsWith("on")) {
        // 移除旧事件
        const eventName = key.slice(2).toLowerCase();
        dom.removeEventListener(eventName, oldAttributes[key]);
      } else if (key === "className") {
        // className 的处理
        const classes = oldAttributes[key].split(" ");
        classes.forEach((classKey) => {
          dom.classList.remove(classKey);
        });
      } else if (key === "style") {
        // style处理
        const style = oldAttributes[key];
        Object.keys(style).forEach((styleName) => {
          dom.style[styleName] = "initial";
        });
      } else {
        if (key !== "children") dom[key] = "";
      }
    });
  }

  attributes &&
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
      } else if (key === "style") {
        // style处理
        const style = attributes[key];
        Object.keys(style).forEach((styleName) => {
          dom.style[styleName] = style[styleName];
        });
      } else {
        if (key !== "children") dom[key] = attributes[key];
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
