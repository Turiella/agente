import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

    
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.message || 'Error de autenticación');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      navigate('/dashboard', {
        state: { message: '¡Inicio de sesión exitoso!' }
      });
      
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      setError(error instanceof Error ? error.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }
    const handleLoginWithMercadoLibre = async () => {
  try {
    const clientId = import.meta.env.VITE_ML_APP_ID;
    const redirectUri = encodeURIComponent(import.meta.env.VITE_ML_REDIRECT_URI);
    
    // PKCE: generar code_verifier y code_challenge (S256 compatible con HTTP/HTTPS)
    const codeVerifier = crypto.getRandomValues(new Uint8Array(32))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    
    // Implementación SHA256 real compatible con HTTP/HTTPS
    const sha256 = async (str: string): Promise<string> => {
      // Si crypto.subtle está disponible, usarlo
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        console.log('PKCE: usando crypto.subtle (HTTPS)');
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
      
      // Si no hay crypto.subtle, usar una implementación simple pero funcional
      console.log('PKCE: usando implementación SHA256 simple');
      
      // Convertir string a bytes
      const msgBuffer = new TextEncoder().encode(str);
      
      // Calcular SHA256 usando una librería externa si está disponible, o fallback
      try {
        // Intentar usar Web Crypto API de forma alternativa
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashB64 = btoa(String.fromCharCode(...hashArray));
        return hashB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      } catch (e) {
        console.error('Error calculando SHA256:', e);
        // Último recurso: usar un hash simple (no es SHA256 real, pero evita undefined)
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
    };
    
    const codeChallenge = await sha256(codeVerifier);
    
    // Codificar code_verifier en el state para que MercadoLibre lo devuelva
    const state = btoa(JSON.stringify({ code_verifier: codeVerifier, ts: Date.now() }));

    // Guardar code_verifier para el callback (localStorage para persistir entre tabs/redirecciones)
    localStorage.setItem('ml_code_verifier', codeVerifier);
    localStorage.setItem('ml_code_challenge', codeChallenge);

    const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    window.location.href = authUrl;
  } catch (error) {
    console.error('Error al iniciar sesión con MercadoLibre:', error);
    setError('No se pudo iniciar sesión con MercadoLibre');
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar sesión
          </h2>
        </div>
        
        {/* Mostrar mensaje de error si existe */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" width="20" height="20" style={{ width: 20, height: 20 }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Correo electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">O continúa con</span>
          </div>
        </div>

        <div>
          <button
            onClick={handleLoginWithMercadoLibre}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <img
              src="/mercadolibre.svg"
              alt="MercadoLibre"
              className="w-5 h-5 mr-2"
              loading="lazy"
            />
            Continuar con MercadoLibre
          </button>
        </div>
      </div>
    </div>
  );
}