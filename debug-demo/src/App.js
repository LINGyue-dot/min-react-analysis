import logo from "./logo.svg";
import "./App.css";
import { useState } from "react";

function App() {
  const [name, setName] = useState(0);
  console.log(name);
  return (
    <div className="App">
      <div
        onClick={() => {
          setName((pre) => pre + 1);
          setName((pre) => pre + 1);
        }}
      >
        qweqwqwe
      </div>
    </div>
  );
}

export default App;
