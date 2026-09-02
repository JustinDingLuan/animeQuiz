import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './databaseAdmin.js';

dotenv.config({
   path: '.env.local',
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey =
   process.env.SUPABASE_PUBLISHABLE_KEY ??
   process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
   throw new Error(
      '缺少 SUPABASE_URL 或 SUPABASE_PUBLISHABLE_KEY'
   );
}

function createAuthClient() {
   return createClient(
      supabaseUrl,
      supabasePublishableKey,
      {
         auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
         },
      }
   );
}

function createAuthResponse(data) {
   return {
      user: data.user
         ? {
            id: data.user.id,
            email: data.user.email ?? null,
            is_anonymous: data.user.is_anonymous === true,
         }
         : null,
      session: data.session
         ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
            token_type: data.session.token_type,
         }
         : null,
   };
}

export async function signUp(email, password) {
   const authClient = createAuthClient();
   const { data, error } = await authClient.auth.signUp({
      email,
      password
   });

   if (error) {
      throw error;
   }

   return createAuthResponse(data);
}

export async function signIn(email, password) {
   const authClient = createAuthClient();
   const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password
   });

   if (error) {
      throw error;
   }

   return createAuthResponse(data);
}

export async function signInAsGuest() {
   const authClient = createAuthClient();
   const { data, error } =
      await authClient.auth.signInAnonymously();

   if (error) {
      throw error;
   }

   return createAuthResponse(data);
}

export async function signOut(accessToken) {
   const { error } =
      await supabaseAdmin.auth.admin.signOut(
         accessToken,
         'local'
      );

   if (error) {
      throw error;
   }
}
