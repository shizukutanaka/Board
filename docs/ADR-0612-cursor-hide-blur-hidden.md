# ADR-0612: blur/hidden でもピアカーソルを隠す

## 状態
実装済 (v1.7.639)

## 背景
ADR-0611 の `pointerleave` 補完 — Alt-Tab 系のウィンドウ blur や
モバイルのバックグラウンド移行では `pointerleave` が発火しないため、
凍結カーソルが残る穴が残っていた。

- `window` blur: `pointerleave` 非発火 → `Net.sendCursorHide()` 追加
- `visibilitychange→hidden`: 同上 (`_clearTouchState` の直後)

`pagehide` は `bye` 送出でピアごと消えるので対象外。

## 決定
両ハンドラに `Net.sendCursorHide()` を1行ずつ追加。冪等 (h:1 重複は
`p.cursor=null` を再設定するだけ) で害なし。

## 影響
- 凍結カーソルの残存経路を全閉塞 (leave/blur/hidden + bye)
