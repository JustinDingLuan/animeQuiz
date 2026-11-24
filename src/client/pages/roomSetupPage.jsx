import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { apiRequest } from '../api/apiRequest.js';
import { useAction } from '../hooks/useAction.js';
import GameSettingsForm from '../components/GameSettingsForm.jsx';
import LoadingDots from '../components/dotsAnimation.jsx';
import PlayerAnswerOrder from '../components/PlayerAnswerOrder.jsx';
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
   return players > 1 ? (
      <>
         <main className="game-entry-main">
            <section className="setup-card">            
               <form className="setup-form">
                  <h2 className="setup-title">選擇遊戲模式</h2>
                  <label htmlFor="mode">遊戲模式：</label>
                  <div className="select-control">
                     <select className="setup-select" name="mode" value={mode} onChange={(e) => onChange(e.target.value)}>                     
                     <option value={'multi'}>多人互動模式</option>
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
                     <option value={'solo'}>單人電腦判定模式</option>
                  </select>
               </div>

               <button className="setup-button" type="button" onClick={() => onConfirm(mode)}>送出</button>
               </form>
            </section>
         </main>
      </>   
   )

}

function RoomEntry({mode, nickname, roomCode, errorMessage, onnicknameChange, onRoomCodeChange, onCreate, onJoin, onBack, isBusy}) {   
   const isCreate = mode === 'create';   
   
   return (
      <>
         <main className="game-entry-main">
            <section className="setup-card">            
               <form className="setup-form">                   
                  <input  
                     id="nickname"
                     className="input-bar-input"
                     type="text"                    
                     placeholder="請輸入暱稱" 
                     value={nickname}
                     onChange={(e) => onnicknameChange(e.target.value)}
                  />                  
                  {mode === 'join' && (
                     <input    
                        id="roomCode"
                        className="input-bar-input"
                        type="text"                    
                        placeholder="請輸入房間代碼" 
                        value={roomCode}
                        onChange={(e) => onRoomCodeChange(e.target.value)}
                     />
                  )}
                  
                  <button className="setup-button" type="button" onClick={isCreate ? onCreate : onJoin} disabled={isBusy}>
                     {isCreate ? '創建房間' : '加入房間'}
                  </button>
                  
                  <button className="setup-button" type="button" onClick={onBack} disabled={isBusy}>
                     返回主選單
                  </button>

                  <p> {errorMessage}</p>
               </form>
            </section>
         </main>
      </>
   );
}

function Lobby({sessionId, roomCode, myRole, nickname, onBack}) {
   const navigate = useNavigate();
   const [lobbyInfo, setLobbyInfo] = useState(null);
   const [lobbyError, setLobbyError] = useState(null);   
   const [isStarting, setIsStarting] = useState(false);

   useEffect(() => {
      let isActive = true;
      const sessionIdEncoded = encodeURIComponent(sessionId);

      async function refreshLobbyInfo() {
         try {
            const result = await apiRequest(`/api/${sessionIdEncoded}/lobbyInfo`, {
               method: 'GET',
            });
            if (!isActive) return;
            console.log('取得房間資訊：', result);
            setLobbyInfo(result);

            if (result.status === 'in_progress') {
               navigate(`/game/${sessionIdEncoded}`);
            }
         }
         catch (error) {
            if (!isActive) return;
            setLobbyError(`取得房間資訊失敗：${error.message}`);
            console.error('取得房間資訊失敗：', error);            
         }
      }      

      const channel = supabase.channel(`lobby:${sessionId}`, {
         config: { private: true },         
      })
      .on('broadcast', { event: 'lobby_changed' }, () => {
         refreshLobbyInfo();
      })
      .subscribe((status, error) => {
         if (error) {
            console.error('訂閱大廳更新失敗：', error);
         }

         if (status === 'SUBSCRIBED') {
            refreshLobbyInfo();
         }
      });

      return () => {
         isActive = false;         
         supabase.removeChannel(channel);
      };
   }, [sessionId, navigate]);

   async function handleStartGame({ quizMode, questionCount }) {
      if (myRole !== 'host') {
         alert('只有房主可以開始遊戲');
         return;
      }

      setIsStarting(true);
      try {
         // 房主點擊開始遊戲，把此次 quiz 的模式、題數傳給後端
         const result = await apiRequest(`/api/${sessionId}/start-game`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: { quizMode, questionCount },
         });

         const sessionIdEncoded = encodeURIComponent(sessionId);
         // 先告知開始遊戲，然後跳轉畫面         
         navigate(`/game/${sessionIdEncoded}`);
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
                  <p>房間代碼：{lobbyInfo?.room_code ?? roomCode}</p>
                  <p>你的角色：{myRole}</p>
                  <p>你的名稱：{nickname}</p>                  
                  <p>已加入玩家人數：{lobbyInfo ? `${lobbyInfo.playerCount}/${lobbyInfo.room_capacity}` : '無法取得'}</p>
                  {lobbyInfo && <PlayerAnswerOrder players={lobbyInfo.players ?? []} />}
                  <p>等待其他玩家加入<LoadingDots /></p>
                  
               {myRole === 'host' && (                  
                  <GameSettingsForm onStart={handleStartGame} onBack={onBack} disabled={isStarting}></GameSettingsForm>
               )}                              
               </div>
            </section>
         </main>
      </>
   )
}

export default function RoomSetupPage() {   
   const [screen, setScreen] = useState('menu');
   const [playerCount, setPlayerCount] = useState(1);
   const [roomMode, setRoomMode] = useState('solo');
   const [roomCode, setRoomCode] = useState('');
   const [mode, setMode] = useState('create');
   const [nickname, setnickname] = useState('');
   const [room, setRoom] = useState(null);
   const [errorMessage, setErrorMessage] = useState('');
   
   const {runAction, pendingAction, isBusy} = useAction();

   function handlePlayerCount() {
      setRoomMode(playerCount === 1 ? 'solo' : 'multi');
      setScreen('select-game-mode');
   }

   function handleGameMode() {   
      setScreen('room-entry');
   }

   async function handleCreateRoom(event) {
      event.preventDefault();

      try {         
         await runAction('createRoom', async () => {
            const user_session = await ensureAuthSession();
            // console.log('目前使用者 id:', user_session?.user?.id);
            if (!user_session) {
               throw new Error('無法取得使用者 session');
            }

            // api request 會自動加入 token
            const result = await apiRequest('/api/create-room', {
               method: 'POST',
               headers: {
                  'Authorization': `Bearer ${user_session.access_token}`,
               },
               body: { nickname: nickname, roomCapacity: playerCount, roomMode: roomMode },
            });

            setRoom({
               sessionId: result.sessionId,
               roomCode: result.roomCode,
               myRole: result.role,
            });
            setScreen('lobby');
         });
      }
      catch (error) {
         console.error('創建房間失敗：', error);
         alert(`創建房間失敗：${error.message}`);
      }
   }

   async function handleJoinRoom(event) {
      event.preventDefault();

      try {
         await runAction('joinRoom', async () => {
            const user_session = await ensureAuthSession();
            if (!user_session) {
               throw new Error('無法取得使用者 session');
            }            

            const result = await apiRequest('/api/join-room', {
               method: 'POST',
               headers: {
                  'Authorization': `Bearer ${user_session.access_token}`,
               },
               body: { roomCode: roomCode, nickname: nickname },
            });

            setRoom({
               sessionId: result.sessionId,
               roomCode: result.roomCode ?? roomCode,
               myRole: result.role,
            });
            setScreen('lobby');
         });
      }
      catch (error) {                  
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
               errorMessage={errorMessage}
               onnicknameChange={setnickname} 
               onRoomCodeChange={setRoomCode} 
               onCreate={handleCreateRoom} 
               onJoin={handleJoinRoom} 
               onBack={() => setScreen('menu')} 
               isBusy={isBusy}
            />)
         }

         {screen === 'lobby' && 
            (<Lobby 
               sessionId={room.sessionId}
               roomCode={room.roomCode} 
               myRole={room.myRole}
               nickname={nickname}
               onBack={() => setScreen('menu')}
            />)
         }         
      </>
   )
}
