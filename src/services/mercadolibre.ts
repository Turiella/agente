export const getAuthUrl = (): string => {
  const redirectUri = encodeURIComponent(import.meta.env.VITE_ML_REDIRECT_URI);
  return `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${import.meta.env.VITE_ML_APP_ID}&redirect_uri=${redirectUri}`;
};
export const getProducts = async (query: string, accessToken: string) => {
  const response = await fetch(`https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Error al buscar productos');
  const data = await response.json();
  return data.results || [];
};
export const getAccessToken = async (code: string): Promise<{ access_token: string }> => {
  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: import.meta.env.VITE_ML_APP_ID,
      client_secret: import.meta.env.VITE_ML_CLIENT_SECRET,
      code: code,
      redirect_uri: import.meta.env.VITE_ML_REDIRECT_URI
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Error en la respuesta de MercadoLibre:', error);
    throw new Error(error.error_description || 'Error al obtener el token de acceso');
  }
  

  return response.json();
};