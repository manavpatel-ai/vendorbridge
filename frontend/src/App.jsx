import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './utility/context/AuthContext';
import Router from './router/Router';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
