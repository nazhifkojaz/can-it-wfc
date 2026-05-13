import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/common';
import { PanelProvider } from './contexts/PanelContext';

// Pages
import LandingPage from './pages/LandingPage';
import SharedListPage from './pages/SharedListPage';
import SharedProfilePage from './pages/SharedProfilePage';
import MapPage from './pages/MapPage';

function App() {
  const rawBase = import.meta.env.BASE_URL || '/';
  const basename = rawBase.endsWith('/') && rawBase !== '/' ? rawBase.slice(0, -1) : rawBase;
  return (
    <ErrorBoundary>
      <PanelProvider>
        <Router basename={basename || '/'}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/list/:id" element={<SharedListPage />} />
            <Route path="/user/:username" element={<SharedProfilePage />} />

            {/* Protected Routes */}
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <MapPage />
                </ProtectedRoute>
              }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </PanelProvider>
    </ErrorBoundary>
  );
}

export default App;
