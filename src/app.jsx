import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import './auth.css';

async function apiRequest(url, { method = 'GET', body, headers = {} } = {}) {
   const requestOptions = {
      method,
      headers: { ...headers },
   };

   if (body !== undefined) {
      requestOptions.body = JSON.stringify(body);
      requestOptions.headers['Content-Type'] =
      'application/json';
   }

   const response = await fetch(url, requestOptions);
   const contentType =
      response.headers.get('content-type') ?? '';
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

async function saveAuthSession(authResult) {
   if (!authResult.session) {
      return null;
   }

   const { data, error } = await supabase.auth.setSession({
      access_token: authResult.session.access_token,
      refresh_token: authResult.session.refresh_token,
   });

   if (error) {
      throw error;
   }

   return data.session;
}

export default function App() {
   const [mode, setMode] = useState('sign-in');
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');

   useEffect(() => {
   
   }, []);

   async function signUp(event) {
      event.preventDefault();
      console.log('註冊中...');
      setMode('sign-up');
      setEmail('');
      setPassword('');

      try {
         const authResult = await apiRequest('/api/auth/sign-up', {
            method: 'POST',
            body: { email, password },
         });

         await saveAuthSession(authResult);
         console.log('註冊成功！');

      }
      catch (error) {
         console.error('註冊失敗：', error);
         alert(`註冊失敗：${error.message}`);
      }
   }

   async function signIn(event) {
      event.preventDefault();

      try {
         const authResult = await apiRequest('/api/auth/sign-in', {
            method: 'POST',
            body: { email, password },
         });

         await saveAuthSession(authResult);
         console.log('登入成功！');
      }
      catch (error) {
         console.error('登入失敗：', error);
         alert(`登入失敗：${error.message}`);
      }
   }

   async function signInAsGuest(event) {
      event.preventDefault();
      console.log('以來賓身份登入中...');
      
   }

   function switchToSignIn() {
      setMode('sign-in');
      setEmail('');
      setPassword('');
   }

   return (
      <main className="auth-page">
         <section className='auth-card'>
            <header className='auth-intro'>
               <h1>動畫知識測驗</h1>
            </header>

            <form className='auth-form' onSubmit={mode === 'sign-in' ? signIn: signUp} hidden={mode !== 'sign-in' && mode !== 'sign-up'}>
               <label htmlFor="email">電子郵件</label>
               <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email:" required />
               <label htmlFor="password">密碼</label>
               <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password:" required />

               <div className='auth-actions'>                     
                  {mode === 'sign-in' ? 
                  (
                     <>
                     <div className='auth-action-row'>
                        <button className='auth-submit-button' onClick={signIn} type="submit">登入</button>
                        <button className='auth-submit-button' onClick={() => setMode('sign-up')} type="submit">註冊</button>
                     </div>
                     <button className="guest-button" onClick={signInAsGuest} type="submit">以來賓身份進行遊戲</button>
                     </>
                  ) : 
                  (
                     <>
                     <button className='auth-submit-button' onClick={signUp} type="submit">註冊</button>
                     <button className='auth-submit-button' onClick={switchToSignIn} type="submit">返回登入</button>
                     </>
                  )
                  }
               </div>
            </form>
         </section>
      </main>
   )
}
