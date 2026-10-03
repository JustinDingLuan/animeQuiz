在 .json 裡面加上 dev --host 0.0.0.0 監聽所有 port
因為現在是用 container 的環境，127.0.0.1:5173 是 container 自己內部的 local host，不是我本機的
從我本機 forward 過去的可能沒辦法被接受?

我用 container 跑的，git 警示所有的 LF 會換成 CRLF
正常沒問題，但如果跑 .sh 會有問題

## css 筆記
- :hover 表示滑鼠停在元素上的時候要做的操作

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

## 20260831
筆記:
- useRef 不會觸發 re-render, useState 會
- React 會重新 render 是因為 a. useState 的 setter 被呼叫 b. componenet 收到新的 props
- react 呼叫 component 的時候，只會傳入一個物件，所以我們給參數也要用物件的方式給 -> {questionType, questionCount}
- const [hints, setHints] = useState([])，這個 function 就會緊緊地跟著這個 hints 的變數。  
即便我用 setHints((prevHints) => {return [...prevHints, result.hint]}) 也是一樣，react 會把這個 function 跟著的變數(hints) 當作 prevHints 傳入這個箭頭函數，prevHints 就是 locally 重新命名而已
- React 框架中，Export Function name 第一個字要大寫

## 20260903
部署到某個固定網域上
vite.config 裡面要寫好 build 要做的事-rollupOptions()，input 是告訴 rollupOptions 這個函式有哪些 html 是可用入口
server 只會用在 dev command 的時候

## 20260904
- createClient 只是告訴我們是跟哪個 supabase 專案互動，signInWithPassword 才是把 email 跟 password 傳給 supabase auth 進行驗證
- session?.access_token 是 js 裡面的 optional chaining，如果物件存在就讀取 access_token，沒有就回傳 undefined
- 新增 requireAuth 在跟遊戲相關的 api 上就好，不用放在跟登入有關的 api 上
- 原本的寫法如果前端連按兩下送出答案並且答對的話，總分會加兩次
- 目前的分數計算，如果前一階段答題完後繼續揭露提示，分數會變少。 解決了，我的 sql 根本沒有拿 is_correct

## 20260910
要在 onrender 上有 github auto deploy on commit 的話，要在 Git Deployment Credentials 這邊連結到自己的 github repo

## 20260930
新想法: 區分成電腦判定模式 & 主持人模式
- 後端 api 尚未新增
- 前端 css 尚未完全更新，有些 button 的樣式沒設定好

## 20261002
新增兩個 rpc: create_host_room 跟 join_room
- create_host_room 負責: 產生房間碼、建立 session 資訊，並且創立人為該位 user、回傳(roomCode, sessionId, role)
- join_room 負責: 判斷 session row data 中有哪筆資料符合使用者輸入的房間碼，回傳 (sessionId, role)

## 20261003
建立流程:
- 使用者選擇要建立房間 or 加入房間。
- 選擇人數。
- 單人 -> 輸入暱稱後可直接開始遊戲。
- 多人 -> 房主輸入暱稱並點擊建立房間，透過 rpc 得到房間碼以及 sessionId，其他人在加入房間的選項輸入房間碼以及暱稱。
- 等待所有玩家加入後，由房主點擊開始遊戲。
目前進度: 房主可以進到建立房間的畫面，但等待室還沒處理好(後端 api 還沒完全處理好)
- bug1: onChange 把輸入值處理了兩次(e.target.value -> "你好" -> "你好.target.value") 
- 解法: 在送進參數的時候直接給 function 就好，不要再用一次箭頭函數
