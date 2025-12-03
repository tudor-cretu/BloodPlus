import React from 'react';
// Importăm componenta hartă (asigură-te că fișierul MapComponent.jsx există în folderul src)
import MapComponent from './MapComponent';
import './App.css';

function App() {
  return (
    <div className="App">
      {/* Aici randăm componenta hărții */}
      <MapComponent />
    </div>
  );
}

export default App;