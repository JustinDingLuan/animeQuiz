import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { apiRequest } from './client/apiRequest.js';
import './auth.css';

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

   async function signInAsGuest() {         
      console.log('以來賓身份登入中...');
      console.log('目前登入還沒實作好');
      
      try {
         // 目前登入還沒弄好
         const authResult = await apiRequest('/api/auth/guest', {
            method: 'POST',
         });

         await saveAuthSession(authResult);
         console.log('以來賓身份登入成功！');

         window.location.assign('./gameEntry.html');
      }
      catch (error) {
         console.error('以來賓身份登入失敗：', error);
         alert(`以來賓身份登入失敗：${error.message}`);
      }
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
               <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email:" disabled />
               <label htmlFor="password">密碼</label>
               <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password:" disabled />

               <div className='auth-actions'>
                  <p>目前登入還沒做好，可以以來賓直接進行遊戲</p>
                  {mode === 'sign-in' ? 
                  (
                     <>
                     <div className='auth-action-row'>
                        <button className='auth-submit-button' onClick={signIn} type="submit" disabled>登入</button>
                        <button className='auth-submit-button' onClick={() => setMode('sign-up')} type="submit" disabled>註冊</button>
                     </div>
                     
                     <button className="guest-button" onClick={signInAsGuest} type="button">以來賓身份進行遊戲</button>
                     </>
                  ) : 
                  (
                     <>
                     <button className='auth-submit-button' onClick={signUp} type="submit" disabled>註冊</button>
                     <button className='auth-submit-button' onClick={switchToSignIn} type="submit" disabled>返回登入</button>
                     </>
                  )
                  }
               </div>
            </form>
         </section>
      </main>
   )
}
