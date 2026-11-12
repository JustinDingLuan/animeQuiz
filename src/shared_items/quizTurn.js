export function canPlayerAnswer(gameState) {
   if (!gameState) {
      throw new Error('遊戲狀態不存在');      
   }
   
   // const isParticipant = gameState.
   return Boolean(      
      gameState.viewer_id &&
      gameState.current_player_id &&
      gameState.viewer_id === gameState.current_player_id &&
      gameState.phase === 'awaiting_answer' &&      
      !gameState.game_over
   );
}
