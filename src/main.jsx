import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Global stylesheets (design tokens, reset, shared layout, keyframes).
// Component-scoped styles are imported by each component module.
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/animations.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
