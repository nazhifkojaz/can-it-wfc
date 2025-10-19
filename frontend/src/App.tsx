import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import Login from './components/auth/Login';
import Register from './components/auth/Register';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Placeholder routes - we'll build these in future steps */}
              <Route 
                path="/cafes" 
                element={
                  <div className="page-container">
                    <h1>Cafes Page (Coming Soon)</h1>
                    <p>This will show the cafe list with map</p>
                  </div>
                } 
              />
              
              <Route 
                path="/visits" 
                element={
                  <ProtectedRoute>
                    <div className="page-container">
                      <h1>My Visits (Coming Soon)</h1>
                      <p>This will show your visit history</p>
                    </div>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/favorites" 
                element={
                  <ProtectedRoute>
                    <div className="page-container">
                      <h1>My Favorites (Coming Soon)</h1>
                      <p>This will show your favorite cafes</p>
                    </div>
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;