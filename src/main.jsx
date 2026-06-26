import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App.jsx';

// Mount React app to #root
const root = createRoot(document.getElementById('root'));
root.render(<App />);