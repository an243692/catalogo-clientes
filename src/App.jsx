import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EcommerceManager from './components/EcommerceManager';
import SuccessPage from './pages/SuccessPage';
import CancelPage from './pages/CancelPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<EcommerceManager />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/cancel" element={<CancelPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;