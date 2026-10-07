import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { apiRequest } from '../api/apiRequest.js';
import GameSettingsForm from '../components/GameSettingsForm.jsx';
import '../styles/styles.css';
import '../../auth.css';

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
   const navigate = useNavigate();
   const [lobbyInfo, setLobbyInfo] = useState(null);
   const [isStarting, setIsStarting] = useState(false);

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

   async function handleStartGame({ quizMode, questionCount }) {
      if (myRole !== 'host') {
         alert('只有房主可以開始遊戲');
         return;
      }

      setIsStarting(true);
      try {
         const result = await apiRequest(`/api/rooms/${sessionId}/start-game`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: { quizMode, questionCount },
         });

         const sessionIdEncoded = encodeURIComponent(sessionId);
         navigate(`/game/${sessionIdEncoded}`, {state:{ quizMode, questionCount, session: result }});
      }
      catch (error) {
         console.error('開始遊戲失敗：', error);
         alert(`開始遊戲失敗：${error.message}`);
      }
      finally {
         // 結束後需要回到初始狀態
         setIsStarting(false);
      }
   }

   return (
      <>
         <main className="game-entry-main">
            <section className="auth-card">
               <div className="setup-form">
                  <h2 className="setup-title">房間資訊</h2>
                  <p>房間代碼：{lobbyInfo?.room_code}</p>
                  <p>已加入玩家人數：{lobbyInfo?.playerCount}/{lobbyInfo?.room_capacity}</p>                  
                  <p>等待其他玩家加入...</p>
                  
               {myRole === 'host' && (
                  // <button className="start-game-button" type="button" onClick={() => navigate(`/game/${sessionId}`)}>
                  //    開始遊戲
                  // </button>
                  <GameSettingsForm onStart={handleStartGame} onBack={onBack} disabled={isStarting}></GameSettingsForm>
               )}               
               {/* <button className="setup-button" type="button" onClick={onBack}>返回</button> */}
               </div>
            </section>
         </main>
      </>
   )
}

export default function RoomSetupPage() {   
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
      </>
   )
}
