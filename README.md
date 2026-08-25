在 .json 裡面加上 dev --host 0.0.0.0 監聽所有 port
因為現在是用 container 的環境，127.0.0.1:5173 是 container 自己內部的 local host，不是我本機的
從我本機 forward 過去的可能沒辦法被接受?

我用 container 跑的，git 警示所有的 LF 會換成 CRLF
正常沒問題，但如果跑 .sh 會有問題

20260825
建立網頁雛形-入口、跳轉頁面、初始遊戲設定
後端 api 尚未寫好