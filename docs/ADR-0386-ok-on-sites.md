# ADR-0386: `_ok`(Object.keys) + `_on` 適用サイト拡大

## 状態
採用 (v1.7.429)

## 背景
dedupe シリーズの継続。`Object.keys(` ×8 と `_g('x').addEventListener` 形の
残置サイト ×6 が未 shorthand だった。

## 決定
- `const _ok=Object.keys` (`_iA` と同じ const 行に連結)
- `X.addEventListener(t,f,o)` → `_on(X,t,f,o)` (help/share/ctx の click/keydown、
  screen.orientation、matchMedia、serviceWorker.controllerchange)
- Service Worker 文字列内の `self.addEventListener` と `mq.addEventListener` の
  存在チェックは変換対象外 (前者は別コンテキスト、後者はプロパティ検査)

## 影響
~130B 回収、~800B ヘッドルームへ。
