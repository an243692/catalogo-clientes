import React from 'react';
import HistoryModal from '../components/HistoryModal';

const History = () => {
  return (
    <div className="history-page">
      <div className="container">
        <div className="history-content">
          <h1>Historial de Pedidos</h1>
          <p>Revisa tus pedidos anteriores</p>
          <HistoryModal isOpen={true} onClose={() => window.history.back()} />
        </div>
      </div>
    </div>
  );
};

export default History;
