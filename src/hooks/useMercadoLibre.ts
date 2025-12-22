import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuthUrl, getAccessToken, getProducts } from '../services/mercadolibre';

interface Product {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
}

export const useMercadoLibre = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [token, setToken] = useState(localStorage.getItem('ml_token') || '');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const login = useCallback(() => {
    window.location.href = getAuthUrl();
  }, []);

  const searchProducts = useCallback(async (query: string) => {
    if (!token) return;
    try {
      const results = await getProducts(query, token);
      setProducts(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error('Error buscando productos:', error);
      return [];
    }
  }, [token]);

  useEffect(() => {
    const initializeAuth = async () => {
      const code = searchParams.get('code');
      if (code) {
        try {
          const { access_token } = await getAccessToken(code);
          localStorage.setItem('ml_token', access_token);
          setToken(access_token);
          setIsAuthenticated(true);
          navigate('/');
        } catch (error) {
          console.error('Error al autenticar con Mercado Libre:', error);
        }
      } else if (token) {

        // setTimeout para evitar la actualización de estado síncrona
        const timer = setTimeout(() => {
          setIsAuthenticated(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    };

    initializeAuth();
  }, [searchParams, navigate, token]);

  return { isAuthenticated, login, searchProducts, products };
};