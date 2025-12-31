import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const bodyText = await req.text();
    console.log('Body raw recibido:', bodyText);
    
    let parsed;
    try {
      parsed = JSON.parse(bodyText);
    } catch (e) {
      console.error('Error parseando JSON:', e);
      throw new Error('Body inválido (no es JSON)');
    }
    
    const { code, state, code_verifier, redirect_uri } = parsed;
    
    // Si code_verifier no viene directamente, extraerlo del state
    let extractedCodeVerifier = code_verifier;
    if (!extractedCodeVerifier && state) {
      try {
        const stateData = JSON.parse(atob(state));
        extractedCodeVerifier = stateData.code_verifier;
        console.log('code_verifier extraído del state:', !!extractedCodeVerifier);
      } catch (e) {
        console.error('Error extrayendo code_verifier del state:', e);
      }
    }
    
    console.log('Request recibido:', { 
      code: code?.substring(0, 20) + '...', 
      state: state?.substring(0, 50) + '...', 
      code_verifier: !!extractedCodeVerifier, 
      redirect_uri 
    });
    
    if (!state) {
  return new Response(
    JSON.stringify({ error: 'Estado de seguridad faltante' }),
    { status: 400, headers: corsHeaders }
  );
}
    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Código de autorización faltante' }),
        { status: 400, headers: corsHeaders }
      )
    }
    if (!extractedCodeVerifier) {
      return new Response(
        JSON.stringify({ error: 'code_verifier faltante (PKCE)' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const ML_CLIENT_ID = (Deno.env.get('ML_APP_ID') || Deno.env.get('VITE_ML_APP_ID'))?.trim()
    const ML_CLIENT_SECRET = (Deno.env.get('ML_CLIENT_SECRET') || Deno.env.get('VITE_ML_CLIENT_SECRET'))?.trim()
    const ML_REDIRECT_URI = (Deno.env.get('ML_REDIRECT_URI') || Deno.env.get('VITE_ML_REDIRECT_URI'))?.trim()
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!ML_CLIENT_ID || !ML_CLIENT_SECRET || !ML_REDIRECT_URI) {
      throw new Error('Configuración de MercadoLibre incompleta')
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Configuración de Supabase incompleta (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
    }

    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        code: code,
        redirect_uri: ML_REDIRECT_URI,
        code_verifier: extractedCodeVerifier,
      }),
    })

    console.log('PKCE: code_verifier presente:', !!extractedCodeVerifier);
    console.log('PKCE: code_verifier length:', extractedCodeVerifier?.length);
    console.log('Enviando a MercadoLibre:', {
      grant_type: 'authorization_code',
      client_id: ML_CLIENT_ID,
      redirect_uri: ML_REDIRECT_URI,
      code: code.substring(0, 20) + '...',
      code_verifier: extractedCodeVerifier.substring(0, 20) + '...',
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      throw new Error(`Error al obtener token: ${error.error_description || error.error}`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in, user_id } = tokenData

    const userResponse = await fetch(`https://api.mercadolibre.com/users/me?access_token=${access_token}`)
    if (!userResponse.ok) {
      throw new Error('Error al obtener información del usuario')
    }
    const userData = await userResponse.json()

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: existingUser } = await supabaseClient
      .from('sellers')
      .select('id')
      .eq('ml_user_id', user_id)
      .single()

    const sellerData = {
      ml_user_id: user_id,
      ml_access_token: access_token,
      ml_refresh_token: refresh_token,
      ml_token_expires_at: new Date(Date.now() + (expires_in * 1000)).toISOString(),
      email: userData.email,
      nickname: userData.nickname,
      first_name: userData.first_name,
      last_name: userData.last_name,
      updated_at: new Date().toISOString()
    }

    if (existingUser) {
      await supabaseClient
        .from('sellers')
        .update(sellerData)
        .eq('ml_user_id', user_id)
    } else {
      await supabaseClient
        .from('sellers')
        .insert([{ ...sellerData, created_at: new Date().toISOString() }])
    }

    const { error: createUserError } = await supabaseClient.auth.admin.createUser({
      email: userData.email,
      email_confirm: true,
      user_metadata: {
        ml_user_id: user_id,
        nickname: userData.nickname,
        full_name: `${userData.first_name} ${userData.last_name}`
      }
    })

    if (createUserError && !String(createUserError.message || '').toLowerCase().includes('already')) {
      throw new Error(`Error creando usuario en Supabase: ${createUserError.message}`)
    }

    // Extraer origin del redirect_uri para el magic link (ej: https://xxx.ngrok.dev)
    const redirectOrigin = redirect_uri ? new URL(redirect_uri).origin : 'https://subthoracic-zahra-brachydactylous.ngrok-free.dev';
    console.log('Redirect origin para magic link:', redirectOrigin);
    
    const { data, error } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.email,
      options: {
        redirectTo: `${redirectOrigin}/dashboard`
      }
    })

    if (error) {
      throw new Error(`Error generando link de sesión: ${error.message}`)
    }

    const actionLink = data?.properties?.action_link
    if (!actionLink) {
      throw new Error('No se pudo generar el link de sesión')
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          email: userData.email,
          nickname: userData.nickname,
          name: `${userData.first_name} ${userData.last_name}`
        },
        action_link: actionLink
      }),
      { 
        status: 200, 
        headers: corsHeaders 
      }
    )

  } catch (error) {
    console.error('Error en el callback de OAuth:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error en la autenticación',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    )
  }
})