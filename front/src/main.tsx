import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import ConnectWallet from "./components/ConnectWallet"

// Polyfill para Buffer
import { Buffer } from 'buffer';
window.Buffer = Buffer;

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <ConnectWallet />
  </React.StrictMode>
)
