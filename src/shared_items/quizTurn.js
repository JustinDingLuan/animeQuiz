export function canPlayerAnswer(gameState) {
   return Boolean(
      gameState?.viewer === 'player' &&
      gameState.viewer_id &&
      gameState.current_player_id &&
      gameState.viewer_id === gameState.current_player_id &&
      gameState.phase === 'awaiting_answer' &&
      // !gameState.pending_answer &&
      !gameState.game_over
   );
}
