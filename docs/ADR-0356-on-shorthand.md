# ADR-0356: `_on` addEventListener shorthand (~750B)

## 状態
承認 — round83

## 背景
512KB 上限対策の継続 (第四批)。`addEventListener` が 62箇所。

## 決定
`_on=(e,t,f,o)=>e.addEventListener(t,f,o)` — whitelist receiver
(canvas/window/ta/rng/opacRng/mc/cp/b/document/docNameEl/sq/inp/
visualViewport/mq)。除外: `self.` (SW blob スコープ)、
`navigator.serviceWorker.`/`screen.orientation.` (ドット連鎖 —
lookbehind `(?<![\w$.])` で誤 rewrite 防止)。

## 影響
raw 522,284B (余白 ~2KB)。挙動不変。2044 全緑。
