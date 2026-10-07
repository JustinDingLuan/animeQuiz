import { useState } from 'react';
import '../styles/styles.css';

export default function GameSettingsForm({ onStart, onBack, disabled=false }) {
   const [quizMode, setQuizMode] = useState('five_hints_guess_character');
   const [questionCount, setQuestionCount] = useState('5');
   // const [roomSessionId, setRoomSessionId] = useState('');

   function handleSubmit(event) {
      event.preventDefault();
      onStart({ quizMode, questionCount });
   }

   return (
      <>         
         <main className="game-entry-main">
            <section id="game-setup" className="setup-card" aria-labelledby="game-setup-title">
            <button className="setup-button" onClick={onBack}>返回主選單</button>
            <p className="setup-eyebrow">Test your anime knowledge</p>
            <h1 id="game-setup-title">Anime Quiz</h1>
            <p className="setup-description">
               選擇喜歡的題型與題數，準備開始挑戰。
            </p>

            <form className="setup-form" onSubmit={handleSubmit}>
               <div className="form-field">
                  <div className="field-heading">
                     <label htmlFor="question-type">題型</label>
                     <span>選擇本次挑戰方式</span>
                  </div>
                  <div className="select-control">
                     <select 
                        className="setup-select" 
                        id="question-type" 
                        name="quiz-mode"
                        value={quizMode}
                        onChange={(e) => setQuizMode(e.target.value)}
                     >
                     <option value="five_hints_guess_character">五提示猜角色</option>
                     <option value="five_hints_guess_anime">五提示猜動畫</option>
                  </select>
                  </div>
               </div>

               <div className="form-field">
                  <div className="field-heading">
                  <label htmlFor="question-count">題數</label>
                  <span>大約每題需要 30 秒</span>
                  </div>
                  <div className="select-control">
                  <select 
                     className="setup-select" 
                     id="question-count" 
                     name="question-count" 
                     value={questionCount}
                     onChange={(e) => setQuestionCount(Number(e.target.value))}
                  >
                     <option value="5">5 題</option>
                     <option value="10">10 題</option>
                     <option value="15">15 題</option>
                     <option value="20">20 題</option>
                  </select>
                  </div>
               </div>

               <button className="start-game-button" type="submit" disabled={disabled}>
                  <span>開始遊戲</span>
                  <span aria-hidden="true">→</span>
               </button>
            </form>
            </section>
         </main>
         
      </>
   );
}