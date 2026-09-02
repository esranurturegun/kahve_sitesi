import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { IsletmeGirisi } from './pages/IsletmeGirisi.jsx';
import { Kafelerim } from './pages/Kafelerim.jsx';
import { OwnerAuthProvider } from './context/OwnerAuthContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OwnerAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/isletme-girisi" element={<IsletmeGirisi />} />
          <Route path="/kafelerim" element={<Kafelerim />} />
        </Routes>
      </BrowserRouter>
    </OwnerAuthProvider>
  </StrictMode>,
);
