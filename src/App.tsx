// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './components/auth/AuthProvider';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { user, loading, signUp } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <div className="min-h-screen bg-gray-100">
          <Routes>
            <Route 
              path="/login" 
              element={user ? <Navigate to="/" replace /> : <Login />} 
            />
            <Route 
              path="/signup" 
              element={user ? <Navigate to="/" replace /> : <Signup onSignup={signUp}/>} 
            />
            <Route 
              path="/" 
              element={
                <ProtectedRoute isAuthenticated={!!user}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;