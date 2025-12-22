import axios from 'axios';

const API_BASE_URL = 'https://api.mercadolibre.com';

export interface Product {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
}

interface MercadoLibreItem {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
}

export const getAuthUrl = (): string => {
  return `${API_BASE_URL}/authorization?response_type=code&client_id=${import.meta.env.VITE_ML_APP_ID}&redirect_uri=${encodeURIComponent(import.meta.env.VITE_ML_REDIRECT_URI)}`;
};

export const getAccessToken = async (code: string): Promise<{ access_token: string }> => {
  const { data } = await axios.post(`${API_BASE_URL}/oauth/token`, null, {
    params: {
      grant_type: 'authorization_code',
      client_id: import.meta.env.VITE_ML_APP_ID.trim(),  // Añadido .trim() para eliminar espacios
      client_secret: import.meta.env.VITE_ML_CLIENT_SECRET.trim(),  // Añadido .trim()
      code,
      redirect_uri: import.meta.env.VITE_ML_REDIRECT_URI,
    },
  });
  return data;
};

export const getProducts = async (query: string, accessToken: string): Promise<Product[]> => {
  const { data } = await axios.get<{ results: MercadoLibreItem[] }>(`${API_BASE_URL}/sites/MLA/search`, {
    params: { 
      q: query,
      limit: 20
    },
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  return (data.results || []).map((item) => ({
    id: item.id,
    title: item.title,
    thumbnail: item.thumbnail,
    price: item.price
  }));
};