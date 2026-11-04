import { useCallback, useRef, useState } from 'react';

export function useAction() {
   const actionLock = useRef(false);
   const [pendingAction, setPendingAction] = useState(null);

   const runAction = useCallback(async (actionName, action) => {
      if (actionLock.current) return;

      actionLock.current = true;
      setPendingAction(actionName);

      try {
         return await action();
      } 
      catch (error) {
         console.error(`執行操作 "${actionName}" 失敗:`, error);
         throw error;
      }
      finally {
         actionLock.current = false;
         setPendingAction(null);
      }
   }, []);

   return {
      runAction,
      pendingAction,
      isBusy: pendingAction !== null,
   };
}