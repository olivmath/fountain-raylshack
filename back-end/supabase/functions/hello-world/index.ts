// Supabase Edge Function - Hello World
// This is a simple test to validate Supabase integration

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface HelloWorldResponse {
  message: string;
  timestamp: string;
  environment: string;
  version: string;
  status: 'ok';
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // Parse request
    const url = new URL(req.url);
    const name = url.searchParams.get('name') || 'Rayls';

    // Create response
    const response: HelloWorldResponse = {
      message: `Hello, ${name}! Welcome to Rayls`,
      timestamp: new Date().toISOString(),
      environment: Deno.env.get('ENVIRONMENT') || 'development',
      version: '1.0.0',
      status: 'ok',
    };

    // Return JSON response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error:', error);

    const errorResponse = {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      status: 'error',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
