import React from 'react';
import MapComponent from './MapComponent';
import { seedCenters } from './firebase/seedCenters'; // Acum importul este sigur

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      
      {/* Buton temporar pentru populare date */}
      <button 
        onClick={seedCenters}
        style={{
          position: 'absolute',
          zIndex: 99,
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          background: 'white',
          border: '2px solid red',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Populează Baza de Date
      </button>

      {/* Componenta Hartă */}
      <MapComponent />
    </div>
  );
}

export default App;