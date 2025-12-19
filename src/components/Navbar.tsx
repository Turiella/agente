import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onLogout();
      navigate('/login');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error al cerrar sesión:', error.message);
      } else if (typeof error === 'string') {
        console.error('Error al cerrar sesión:', error);
      } else {
        console.error('Error desconocido al cerrar sesión');
      }
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>Soporte al Cliente</h1>
      </div>
      {isAuthenticated && (
        <div className="navbar-actions">
          <button onClick={handleLogout} className="logout-button">
            Cerrar Sesión
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;