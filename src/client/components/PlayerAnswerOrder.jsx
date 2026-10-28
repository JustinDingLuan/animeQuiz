import './PlayerAnswerOrder.css';

export default function PlayerAnswerOrder({ players = [] }) {
   return (
      <section className="player-answer-order" aria-label="玩家答題順序">
         <h2>玩家答題順序</h2>
         {players.length === 0 ? (
            <p>尚無玩家加入，房主不列入答題順序。</p>
         ) : (
            <>
               <ol>
                  {players.map((player) => (
                     <li key={player.user_id} value={player.answer_order}>
                        <span className="player-answer-order-number">
                           {player.answer_order}
                        </span>
                        <span>{player.nickname || '未命名玩家'}</span>
                     </li>
                  ))}
               </ol>
               <p>依加入房間的順序排列，房主不列入答題順序。</p>
            </>
         )}
      </section>
   );
}
