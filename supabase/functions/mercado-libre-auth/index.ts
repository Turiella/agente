// @deno-types="https://deno.land/x/types/deno.d.ts"
/// <reference no-default-lib="true" />
// @ts-expect-error - Deno types
const { exit, env } = globalThis.Deno;
// @ts-expect-error - Supabase types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Tipos para las respuestas de MercadoLibre
interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user_id: number
}

interface UserData {
  id: number
  email: string
  nickname: string
  permalink: string
}

interface RequestBody {
  code: string
  redirect_uri: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

// Obtener y validar variables de entorno
const envVars = {
  ML_APP_ID: env.get('ML_APP_ID') || '',
  ML_CLIENT_SECRET: env.get('ML_CLIENT_SECRET') || '',
  supabaseUrl: env.get('SUPABASE_URL') || '',
  supabaseKey: env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
};

// Extraer variables para facilitar su uso
const { ML_APP_ID, ML_CLIENT_SECRET, supabaseUrl, supabaseKey } = envVars;

const missingVars = Object.entries(envVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Iniciar el servidor
// @ts-expect-error - Deno.serve type
Deno.serve({ port: 8000 }, async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: new Headers(corsHeaders)
    });
  }

  try {
    // Parse request body
    const { code, redirect_uri } = await req.json() as RequestBody

    if (!code || !redirect_uri) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: code and redirect_uri are required' 
        }), {
          status: 400,
          headers: new Headers({
            ...corsHeaders,
            'Content-Type': 'application/json'
          })
        });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ML_APP_ID,
        client_secret: ML_CLIENT_SECRET,
        code: code,
        redirect_uri: redirect_uri,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      console.error('MercadoLibre token exchange error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to exchange code for access token',
          details: error 
        }), {
          status: 400,
          headers: new Headers({
            ...corsHeaders,
            'Content-Type': 'application/json'
          })
        });
    }

    const tokens = await tokenResponse.json() as TokenResponse
    
    // Get user info from MercadoLibre
    const userResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      const error = await userResponse.text()
      console.error('Failed to fetch user info:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch user information' 
        }), {
          status: 400,
          headers: new Headers({
            ...corsHeaders,
            'Content-Type': 'application/json'
          })
        });
    }

    const userData = await userResponse.json() as UserData

    // Store or update user in the database
    const { error: dbError } = await supabase
      .from('sellers')
      .upsert(
        {
          user_id: userData.id,
          email: userData.email,
          nickname: userData.nickname,
          permalink: userData.permalink,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
        },
        { onConflict: 'user_id', ignoreDuplicates: false }
      )
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to save user data', details: dbError }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Return the tokens and user data
    return new Response(
      JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        user: {
          id: userData.id,
          email: userData.email,
          nickname: userData.nickname,
          permalink: userData.permalink,
        },
      }), {
        status: 200,
        headers: new Headers({
          ...corsHeaders,
          'Content-Type': 'application/json'
        })
      });

  } catch (error) {
    console.error('Unexpected error:', error instanceof Error ? error.message : 'Unknown error')
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: new Headers({
          ...corsHeaders,
          'Content-Type': 'application/json'
        })
      });
  }
  
  // Default response for unknown routes
  return new Response('Not Found', { 
    status: 404,
    headers: new Headers(corsHeaders)
  });
});

console.log('Server running on http://localhost:8000');
