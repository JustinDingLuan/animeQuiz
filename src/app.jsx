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

// export default function App() {
//    const [mode, setMode] = useState('sign-in');
//    const [email, setEmail] = useState('');
//    const [password, setPassword] = useState('');

//    useEffect(() => {
   
//    }, []);

//    async function signUp(event) {
//       event.preventDefault();
//       console.log('註冊中...');
//       setMode('sign-up');
//       setEmail('');
//       setPassword('');

//       try {
//          const authResult = await apiRequest('/api/auth/sign-up', {
//             method: 'POST',
//             body: { email, password },
//          });

//          await saveAuthSession(authResult);
//          console.log('註冊成功！');

//       }
//       catch (error) {
//          console.error('註冊失敗：', error);
//          alert(`註冊失敗：${error.message}`);
//       }
//    }

//    async function signIn(event) {
//       event.preventDefault();

//       try {
//          const authResult = await apiRequest('/api/auth/sign-in', {
//             method: 'POST',
//             body: { email, password },
//          });

//          await saveAuthSession(authResult);
//          console.log('登入成功！');
//       }
//       catch (error) {
//          console.error('登入失敗：', error);
//          alert(`登入失敗：${error.message}`);
//       }
//    }

//    async function signInAsGuest() {         
//       console.log('以來賓身份登入中...');
//       console.log('目前登入還沒實作好');
      
//       try {
//          // 目前登入還沒弄好
//          const authResult = await apiRequest('/api/auth/guest', {
//             method: 'POST',
//          });

//          await saveAuthSession(authResult);
//          console.log('以來賓身份登入成功！');

//          window.location.assign('./gameEntry.html');
//       }
//       catch (error) {
//          console.error('以來賓身份登入失敗：', error);
//          alert(`以來賓身份登入失敗：${error.message}`);
//       }
//    }

//    function switchToSignIn() {
//       setMode('sign-in');
//       setEmail('');
//       setPassword('');
//    }

//    return (
//       <main className="auth-page">
//          <section className='auth-card'>
//             <header className='auth-intro'>
//                <h1>動畫知識測驗</h1>
//             </header>

//             <form className='auth-form' onSubmit={mode === 'sign-in' ? signIn: signUp} hidden={mode !== 'sign-in' && mode !== 'sign-up'}>
//                <label htmlFor="email">電子郵件</label>
//                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email:" disabled />
//                <label htmlFor="password">密碼</label>
//                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password:" disabled />

//                <div className='auth-actions'>
//                   <p>目前登入還沒做好，可以以來賓直接進行遊戲</p>
//                   {mode === 'sign-in' ? 
//                   (
//                      <>
//                      <div className='auth-action-row'>
//                         <button className='auth-submit-button' onClick={signIn} type="submit" disabled>登入</button>
//                         <button className='auth-submit-button' onClick={() => setMode('sign-up')} type="submit" disabled>註冊</button>
//                      </div>
                     
//                      <button className="guest-button" onClick={signInAsGuest} type="button">以來賓身份進行遊戲</button>
//                      </>
//                   ) : 
//                   (
//                      <>
//                      <button className='auth-submit-button' onClick={signUp} type="submit" disabled>註冊</button>
//                      <button className='auth-submit-button' onClick={switchToSignIn} type="submit" disabled>返回登入</button>
//                      </>
//                   )
//                   }
//                </div>
//             </form>
//          </section>
//       </main>
//    )
// }

function startGame(roomCode) {
   // 要補上驗證房間碼的部分
   window.location.assign(`./gameEntry.html?roomCode=${roomCode}`);
}

function Menu({onCreate, onJoin}) {
   return (
      <div className="game-entry-page">
         <main className="game-entry-main">
            <section className="setup-card" aria-labelledby="menu-title">
               <p className="setup-eyebrow">Test your anime knowledge</p>
               <h1 id="menu-title">Anime Quiz</h1>
               <p className="setup-description">歡迎來到動畫知識測驗，請選擇創建房間或加入房間。</p>
               <div className="setup-form">
                  <button className="start-game-button" type="button" onClick={onCreate}>
                     <span>創建房間</span>
                     <span aria-hidden="true">→</span>
                  </button>
                  <button className="room-join-button" type="button" onClick={onJoin}>加入房間</button>
               </div>
            </section>
         </main>
      </div>
   );
}

function SelectPlayers({playerCount, onChange, onConfirm}) {
   console.log('we are in select players page');
   return (
      <>
         <main className="game-entry-main">
            <section className="setup-card">            
               <form className="setup-form">
                  <h2 className="setup-title">選擇玩家人數</h2>
                  <label htmlFor="players">玩家人數：</label>
                  <div className="select-control">
                     <select className="setup-select" name="players" value={playerCount} onChange={(e) => onChange(parseInt(e.target.value))}>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                     </select>
                  </div>

                  <button type="button" onClick={() => onConfirm(playerCount)}>送出</button>
               </form>
            </section>
         </main>
      </>
   )
}

function SelectGameMode({mode, players, onChange, onConfirm}) {
   console.log('we are in select game mode page');
   return players > 1 ? (
      <>
         <main className="game-entry-main">
            <section className="setup-card">            
               <form className="setup-form">
                  <h2 className="setup-title">選擇遊戲模式</h2>
                  <label htmlFor="mode">遊戲模式：</label>
                  <div className="select-control">
                     <select className="setup-select" name="mode" value={mode} onChange={(e) => onChange(e.target.value)}>                     
                     <option value={'host'}>多人互動模式</option>
                  </select>
               </div>

               <button type="button" onClick={() => onConfirm(mode)}>送出</button>
               </form>
            </section>
         </main>
      </>
   ): (
      <>
      <main className="game-entry-main">
            <section className="setup-card">            
               <form className="setup-form">
                  <h2 className="setup-title">選擇遊戲模式</h2>
                  <label htmlFor="mode">遊戲模式：</label>
                  <div className="select-control">
                     <select className="setup-select" name="mode" value={mode} onChange={(e) => onChange(e.target.value)}>                     
                     <option value={'auto'}>電腦判定模式</option>
                  </select>
               </div>

               <button type="button" onClick={() => onConfirm(mode)}>送出</button>
               </form>
            </section>
         </main>
      </>   
   )

}

function HostRoom({players, onBack}) {
   console.log('we are in host room page');
   const [roomCode, setRoomCode] = useState('');
   const [joinPlayerCount, setJoinPlayerCount] = useState(0);


   // 等後端給唯一的房間碼
   // useEffect(() => {      
   //    const fetchRoomCode = async () => {         
   //       const response = await fetch('/api/create-room', {
   //          method: 'POST',
   //          headers: {
   //             'Content-Type': 'application/json'
   //          },
   //          body: JSON.stringify({ players })
   //       });
   //       const data = await response.json();
   //       setRoomCode(data.roomCode);
   //    };

   //    fetchRoomCode();
   // }, []);

   return (
      <>
         <main className="game-entry-main">
            <section className="auth-card">
               <form className="setup-form">
                  <h2 className="setup-title">創建房間</h2>
                  <p>房間代碼：{roomCode}</p>
                  <p>已加入玩家人數：{joinPlayerCount}/{players}</p>
                  <p>等待其他玩家加入...</p>
            
               <button type="button" onClick={() => startGame(roomCode)}>開始遊戲</button>
               <button type="button" onClick={onBack}>返回</button>
               </form>
            </section>
         </main>
      </>
   )
}
function JoinRoom({onBack}) {
   console.log('we are in join room page');
   const [roomCode, setRoomCode] = useState('');
   
   async function handleJoinRoom(event) {
      event.preventDefault();
      
      // 等後端的 api? 判斷房間是否存在? 對應的房間碼是否正確?
   }
   
   return (
      <>
         <main className="game-entry-main">
            <section className="auth-card">
               <form className="setup-form">
                  <h2 className="setup-title">加入房間</h2>

               <p>請輸入房間代碼</p>
            
                  <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="Room Code:" />
                  <button type="submit">加入</button>
                  <button type="button" onClick={onBack}>返回</button>
               </form>
            </section>
         </main>
      </>
   )
}


export default function App() {
   const [screen, setScreen] = useState('menu');
   const [playerCount, setPlayerCount] = useState(1);
   const [gameMode, setGameMode] = useState('auto');

   function handlePlayerCount() {
      setScreen('select-game-mode');
   }

   function handleGameMode() {
      if (gameMode === 'host') {
         setScreen('host-room');
      }
      else if (gameMode === 'auto') {
         // 直接開始遊戲
         startGame();
      }
   }
   return (
      <>
         {screen === 'menu' && (<Menu onCreate={() => setScreen('select-players')} onJoin={() => setScreen('join-room')} />)}
         {screen === 'select-players' && (<SelectPlayers playerCount={playerCount} onChange={setPlayerCount} onConfirm={handlePlayerCount} />)}
         {screen === 'host-room' && (<HostRoom players={playerCount} onBack={() => setScreen('menu')} />)}
         {screen === 'join-room' && (<JoinRoom onBack={() => setScreen('menu')} />)}
         {screen === 'select-game-mode' && (<SelectGameMode mode={gameMode} players={playerCount} onChange={setGameMode} onConfirm={() => handleGameMode()} />)}
      </>
   )
}
