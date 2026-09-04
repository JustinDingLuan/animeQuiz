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
