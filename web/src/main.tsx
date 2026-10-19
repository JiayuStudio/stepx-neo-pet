// 必须先于 App/store 加载：store 在模块初始化时读取 window.NeoNative
import './game/neo-browser'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './neo.css'
import './zh' 


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
