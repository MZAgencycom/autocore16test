import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SubscriptionProvider } from './components/subscription/SubscriptionProvider'
import { StripeProvider } from './components/subscription/StripeProvider'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <StripeProvider>
          <SubscriptionProvider>
            <App />
          </SubscriptionProvider>
        </StripeProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>,
)

