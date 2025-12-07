# Safari YouTube Error 153 - Missing Critical Logs

## What I Need to See

The console should show these logs (in order):

### 1. Browser Detection
```
[YOUTUBE-PLAYER-INIT] Browser: Safari Origin: https://your-url.app.github.dev
```

### 2. PlayerConfig Before YT.Player Creation
```
[YOUTUBE-PLAYER-INIT] Full playerConfig: {"videoId":"xfGrN3ZsPLA","playerVars":{"autoplay":0,"controls":0,"modestbranding":1,"rel":0,"enablejsapi":1,"origin":"https://your-url.app.github.dev"},"host":"https://www.youtube.com"}
```

### 3. Iframe src After Creation
```
[YOUTUBE-PLAYER-INIT] Iframe element found
[YOUTUBE-PLAYER-INIT] Iframe src: https://www.youtube.com/embed/xfGrN3ZsPLA?origin=https://...
[YOUTUBE-PLAYER-INIT] Origin in src: https://your-actual-url.app.github.dev
[YOUTUBE-PLAYER-INIT] Expected origin: https://your-actual-url.app.github.dev
```

---

## If You Don't See These Logs

The page might have cached JavaScript. Try:
1. Safari → Develop → Empty Caches
2. Hard reload: Cmd+Shift+R
3. Check console again

---

## What to Share

Copy the ENTIRE console output from Safari, specifically:
- All lines with `[YOUTUBE-PLAYER-INIT]`
- All lines with `[YOUTUBE-MESSAGE]`
- The Error 153 line

Example of what I'm looking for:
```
[YOUTUBE-PLAYER-INIT] Browser: Safari Origin: https://ideal-telegram-wrjj6gj95gp43g7wr-5001.app.github.dev
[YOUTUBE-PLAYER-INIT] Full playerConfig: {"videoId":"xfGrN3ZsPLA","playerVars":{"origin":"https://ideal-telegram-wrjj6gj95gp43g7wr-5001.app.github.dev"}}
[YOUTUBE-PLAYER-INIT] Iframe src: https://www.youtube.com/embed/xfGrN3ZsPLA?origin=https%3A%2F%2Fideal-telegram-wrjj6gj95gp43g7wr-5001.app.github.dev
[YOUTUBE-PLAYER-INIT] Origin in src: https://ideal-telegram-wrjj6gj95gp43g7wr-5001.app.github.dev
[YOUTUBE-PLAYER-INIT] Expected origin: https://ideal-telegram-wrjj6gj95gp43g7wr-5001.app.github.dev
[YOUTUBE-MESSAGE] #3 Parsed data: "{"event":"onError","info":153,...}"
```

This will show if:
- A) Origin is correctly passed to YT.Player → but YouTube still rejects it (YouTube issue)
- B) Origin is missing from iframe src → YT.Player Safari bug (we bypass it)
- C) Origin values don't match → window.location.origin issue (we fix it)
