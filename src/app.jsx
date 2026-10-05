import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { apiRequest } from './client/apiRequest.js';
import './auth.css';
import './styles.css';

// async function saveAuthSession(authResult) {
//    if (!authResult.session) {
//       return null;
//    }

//    const { data, error } = await supabase.auth.setSession({
//       access_token: authResult.session.access_token,
//       refresh_token: authResult.session.refresh_token,
//    });

//    if (error) {
//       throw error;
//    }

//    return data.session;
// }

async function ensureAuthSession() {
   const { data: { session }, error:sessionError } = await supabase.auth.getSession();

   if (sessionError) {
      throw sessionError;
   }

   if (session) return session;

   const {data, error} = await supabase.auth.signInAnonymously();

   if (error) {
      throw error;
   }

   if (!data.session) {
      throw new Error('無法取得 session');
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
   // 這邊讓房主點擊開始遊戲後，要讓房主主導接下來的選擇內容
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

                  <button className="setup-button" type="button" onClick={() => onConfirm(playerCount)}>送出</button>
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

               <button className="setup-button" type="button" onClick={() => onConfirm(mode)}>送出</button>
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
                     <option value={'auto'}>單人電腦判定模式</option>
                  </select>
               </div>

               <button className="setup-button" type="button" onClick={() => onConfirm(mode)}>送出</button>
               </form>
            </section>
         </main>
      </>   
   )

}

function RoomEntry({mode, nickname, roomCode, onnicknameChange, onRoomCodeChange, onCreate, onJoin, onBack}) {
   console.log('we are in room entry page');
   const isCreate = mode === 'create';   

   return (
      <>
         <main className="game-entry-main">
            <section className="setup-card">            
               <form className="setup-form">                  
                  <input  
                     id="nickname"
                     type="text"                    
                     placeholder="請輸入暱稱" 
                     value={nickname}
                     onChange={(e) => onnicknameChange(e.target.value)}
                  />
                  {mode === 'join' && (
                     <input    
                        id="roomCode"
                        type="text"                    
                        placeholder="請輸入房間代碼" 
                        value={roomCode}
                        onChange={(e) => onRoomCodeChange(e.target.value)}
                     />
                  )}
                  
                  <button className="setup-button" type="button" onClick={isCreate ? onCreate : onJoin}>
                     {isCreate ? '創建房間' : '加入房間'}
                  </button>
                  
                  <button className="setup-button" type="button" onClick={onBack}>
                     返回主選單
                  </button>
               </form>
            </section>
         </main>
      </>
   );
}

function Lobby({sessionId, roomCode, myRole, players, onBack}) {
   console.log('we are in host room page');
   const [lobbyInfo, setLobbyInfo] = useState(null);

   useEffect(() => {
      let isActive = true;
      let timeoutId = null;

      async function pollLobby() {
         try {
            const user_session = await ensureAuthSession();
            if (!user_session) {
               throw new Error('無法取得使用者 session');
            }
            const sessionIdEncoded = encodeURIComponent(sessionId);
            const result = await apiRequest(`/api/${sessionIdEncoded}/lobbyInfo`, {
               method: 'GET',
               headers: {
                  'Authorization': `Bearer ${user_session.access_token}`,
               },
            });            
            
            setLobbyInfo(result);
            console.log('lobby info:', result);
         }
         catch (error) {
            if (!isActive) return;
            console.error('取得房間資訊失敗：', error);
         }
         
         // 如果還沒開始遊戲(isActive)，每兩秒更新一次大廳狀態
         if (isActive) {
            timeoutId = setTimeout(pollLobby, 2000);
         }
      }

      pollLobby();
      return () => {
         // 如果已經結束了，就不要再更新大廳狀態了 -> 把 timeout 清掉
         isActive = false;
         clearTimeout(timeoutId);
      };
   }, [sessionId]);

   return (
      <>
         <main className="game-entry-main">
            <section className="auth-card">
               <form className="setup-form">
                  <h2 className="setup-title">房間資訊</h2>
                  <p>房間代碼：{lobbyInfo?.room_code}</p>
                  <p>已加入玩家人數：{lobbyInfo?.playerCount}/{lobbyInfo?.room_capacity}</p>                  
                  <p>等待其他玩家加入...</p>
                  
               {myRole === 'host' && (
                  <button className="start-game-button" type="button" onClick={() => startGame(sessionId)}>
                     開始遊戲
                  </button>
               )}               
               <button className="setup-button" type="button" onClick={onBack}>返回</button>
               </form>
            </section>
         </main>
      </>
   )
}

// function JoinRoom({onBack}) {
//    console.log('we are in join room page');
//    const [roomCode, setRoomCode] = useState('');
   
//    async function handleJoinRoom(event) {
//       event.preventDefault();
      
//       // 等後端的 api? 判斷房間是否存在? 對應的房間碼是否正確?
//    }
   
//    return (
//       <>
//          <main className="game-entry-main">
//             <section className="auth-card">
//                <form className="setup-form">
//                   <h2 className="setup-title">加入房間</h2>

//                <p>請輸入房間代碼</p>
            
//                   <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="Room Code:" />
//                   <button className="setup-button" type="button" onClick={handleJoinRoom}>加入</button>
//                   <button className="setup-button" type="button" onClick={onBack}>返回</button>
//                </form>
//             </section>
//          </main>
//       </>
//    )
// }


export default function App() {
   const [screen, setScreen] = useState('menu');
   const [playerCount, setPlayerCount] = useState(1);
   const [roomMode, setRoomMode] = useState('auto');
   const [roomCode, setRoomCode] = useState('');
   const [mode, setMode] = useState('create');
   const [nickname, setnickname] = useState('');
   const [room, setRoom] = useState(null);

   function handlePlayerCount() {
      setScreen('select-game-mode');
   }

   function handleGameMode() {
      // if (roomMode === 'host') {
      //    setScreen('room-entry');
      // }
      // else if (roomMode === 'auto') {
      //    // 直接開始遊戲
      //    setScreen('room-entry');
      // }
      setScreen('room-entry');
   }

   async function handleCreateRoom(event) {
      event.preventDefault();

      try {
         const user_session = await ensureAuthSession();
         console.log('目前使用者 id:', user_session?.user?.id);
         if (!user_session) {
            throw new Error('無法取得使用者 session');
         }

         // api request 會自動加入 token         
         const result = await apiRequest('/api/create-room', {
            method: 'POST',
            headers: {
               'Authorization': `Bearer ${user_session.access_token}`,
            },
            body: { nickname: nickname, roomCapacity: playerCount },
         });

         setRoom({
            sessionId: result.sessionId,
            roomCode: result.roomCode,
            myRole: result.role,
         });
         setScreen('lobby');
      }
      catch (error) {
         console.error('創建房間失敗：', error);
         alert(`創建房間失敗：${error.message}`);
      }
   }

   async function handleJoinRoom(event) {
      event.preventDefault();

      try {
         const user_session = await ensureAuthSession();
         if (!user_session) {
            throw new Error('無法取得使用者 session');
         }
         console.log('目前使用者 id:', user_session?.user?.id);

         const result = await apiRequest('/api/join-room', {
            method: 'POST',
            headers: {
               'Authorization': `Bearer ${user_session.access_token}`,
            },
            body: { roomCode: roomCode, nickname: nickname },
         });

         setRoom({
            sessionId: result.sessionId,
            roomCode: roomCode,
            myRole: result.role,
         });
         setScreen('lobby');
      }
      catch (error) {
         console.error('加入房間失敗：', error);
         alert(`加入房間失敗：${error.message}`);
      }
   }

   return (
      <>
         {screen === 'menu' && 
            (<Menu 
               onCreate={() => {
                  setScreen('select-players');
                  setMode('create');
               }} 
               onJoin={() => {
                  setScreen('room-entry');
                  setMode('join');
               }} 
            />)
         }

         {screen === 'select-players' && 
            (<SelectPlayers 
               playerCount={playerCount} 
               onChange={setPlayerCount} 
               onConfirm={handlePlayerCount} 
            />)
         }

         {screen === 'select-game-mode' && 
            (<SelectGameMode 
               mode={roomMode} 
               players={playerCount} 
               onChange={setRoomMode} 
               onConfirm={handleGameMode} 
            />)
         }

         {screen === 'room-entry' && 
            (<RoomEntry 
               mode={mode} 
               nickname={nickname} 
               roomCode={roomCode} 
               onnicknameChange={setnickname} 
               onRoomCodeChange={setRoomCode} 
               onCreate={handleCreateRoom} 
               onJoin={handleJoinRoom} 
               onBack={() => setScreen('menu')} 
            />)
         }

         {screen === 'lobby' && 
            (<Lobby 
               sessionId={room.sessionId}
               roomCode={room.roomCode} 
               myRole={room.myRole}
               players={playerCount} 
               onBack={() => setScreen('menu')}
            />)
         }
         {/* {screen === 'join-room' && (<JoinRoom onBack={() => setScreen('menu')} />)} */}
      </>
   )
}
