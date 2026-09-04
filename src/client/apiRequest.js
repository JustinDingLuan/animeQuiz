import { supabase } from '../supabase.js';

export async function apiRequest(url, options={}) {
   const requestOptions = {
      method: options.method,
      headers: { ...options.headers },
   };

   // 取得目前使用者的 session
   // getSession 會拿到 { session: {access_token, refresh_token, ...}, user: {...} }，所以要再解構一層
   const {data: {session}} = await supabase.auth.getSession();
   if (session?.access_token) {
      requestOptions.headers['Authorization'] =
      `Bearer ${session.access_token}`;
   }

   if (options.body !== undefined) {
      requestOptions.body = JSON.stringify(options.body);
      requestOptions.headers['Content-Type'] =
      'application/json';
   }

   const response = await fetch(url, requestOptions);
   const contentType = response.headers.get('content-type') ?? '';
   const result = contentType.includes('application/json')
      ? await response.json()
      : null;

   if (!response.ok) {
      throw new Error(
      result?.message || `Request failed (${response.status})`
      );
   }

   return result;
}