import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import {GlobalStateProvider, GlobalStateProviderL1} from "./state/GlobalStateProvider.tsx";

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GlobalStateProvider>
            <GlobalStateProviderL1>
                <App/>
            </GlobalStateProviderL1>
        </GlobalStateProvider>
    </React.StrictMode>,
)
