import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      if (!code) {
        navigate('/login');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('mercado-libre-auth', {
          body: { code }
        });

        if (error) throw error;
        
        // Guarda el token en Supabase Auth
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'read write',
            redirectTo: window.location.origin,
            queryParams: {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_in: data.expires_in.toString(),
            }
          }
        });

        if (authError) throw authError;

        navigate('/');

      } catch (error) {
        console.error('Error during authentication:', error);
        navigate('/login?error=auth_failed');
      }
    };

    exchangeCodeForToken();
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-lg">Procesando autenticación...</p>
      </div>
    </div>
  );
}