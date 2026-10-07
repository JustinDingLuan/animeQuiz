import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL;

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('找不到 Supabase 的環境變數');
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      // 開發時讓分頁各自登入，正式建置則保留跨分頁的登入狀態。
      storage: import.meta.env.DEV
        ? window.sessionStorage
        : window.localStorage,
    },
  }
);
