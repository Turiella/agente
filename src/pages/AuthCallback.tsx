import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const AuthCallback = (): React.JSX.Element => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const hasHandledRef = useRef(false);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    const handleAuth = async () => {
      try {
        if (hasHandledRef.current) return;
        hasHandledRef.current = true;
        
        // Si hay tokens en la URL (magic link), procesarlos directamente
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        
        if (accessToken) {
          console.log('Magic link detectado, procesando sesión...');
          
          // Si el redirect_to es localhost, forzar redirect a ngrok
          const urlParams = new URLSearchParams(window.location.search);
          const redirectTo = urlParams.get('redirect_to');
          
          if (redirectTo && redirectTo.includes('localhost:3000')) {
            console.log('Detectado redirect a localhost, forzando ngrok...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || ''
            });
            
            if (sessionError) throw sessionError;
            
            // Redirigir a ngrok dashboard
            window.location.href = `${window.location.origin}/dashboard`;
            return;
          }
        }
        
        if (error) {
          throw new Error(`Error de autenticación: ${error}`);
        }
        if (!code || !state) {
          throw new Error('Faltan parámetros de autenticación');
        }

        const handledKey = `ml_oauth_handled:${code}`;
        if (sessionStorage.getItem(handledKey) === '1') return;
        sessionStorage.setItem(handledKey, '1');

        if (!supabaseAnonKey) {
          throw new Error('Faltan las variables de entorno de Supabase (VITE_SUPABASE_ANON_KEY)');
        }
        
        const response = await fetch('https://ooazjlusxixmcbepqwiu.supabase.co/functions/v1/mercadolibre-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            code,
            state,
            redirect_uri: window.location.origin + '/auth/callback'
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message =
            errorData?.error && errorData?.details
              ? `${errorData.error}: ${errorData.details}`
              : errorData?.error || `Error HTTP: ${response.status}`;
          throw new Error(message);
        }
        
        const data = await response.json();
        console.log('Respuesta del servidor:', data);
        
        if (data?.action_link) {
          window.location.href = data.action_link;
          return;
        }
        
        if (data?.session) {
          const { error: signInError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });

          if (signInError) throw signInError;
          navigate('/dashboard', {
            state: {
              success: true,
              message: '¡Inicio de sesión exitoso!'
            }
          });
          return;
        }
        
        throw new Error('Respuesta inválida del servidor (faltan action_link/session)');
      } catch (error) {
        console.error('Error en la autenticación:', error);
        navigate('/login', { 
          state: { 
            error: 'auth_failed',
            message: error instanceof Error ? error.message : 'Error desconocido al autenticar'
          } 
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    handleAuth();
  }, [code, state, error, navigate, supabaseAnonKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Autenticando con MercadoLibre...</p>
        </div>
      </div>
    );
  }

  return <></>;
};

export default AuthCallback;