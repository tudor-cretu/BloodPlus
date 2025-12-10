import React from 'react';
import MapComponent from './MapComponent';
import { seedCenters } from './firebase/seedCenters'; // Acum importul este sigur

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* Componenta Hartă */}
      <MapComponent />
    </div>
  );
}

export default App;