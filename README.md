在 .json 裡面加上 dev --host 0.0.0.0 監聽所有 port
因為現在是用 container 的環境，127.0.0.1:5173 是 container 自己內部的 local host，不是我本機的
從我本機 forward 過去的可能沒辦法被接受?

我用 container 跑的，git 警示所有的 LF 會換成 CRLF
正常沒問題，但如果跑 .sh 會有問題

#### 統一檔名用駝峰，變數用_
## 20260825
建立網頁雛形-入口、跳轉頁面、初始遊戲設定
後端 api 尚未寫好

## 20260826
把建立 session 的部分寫好了，但 next hint 跟 check answer 的部分還沒寫完
有成功把 session 的內容存到 database 裡面，後續應該要再處理如果使用者中間把頁面關掉的狀況?

## 20260827
寫完 next hint 跟 check answer 的部分，並且可以成功帶入下一題
接下來就是在 nextQuestion 的地方判斷，如果已經是最後一題，就要跳到結算畫面去