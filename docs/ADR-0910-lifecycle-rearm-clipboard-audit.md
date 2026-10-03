# ADR-0910 — ライフサイクル再アーム + クリップボード経路監査 (完走・実害なし)

## Context

round659 の監査軸: 「一度失効するリソースの再アーム網羅性」と
クリップボード組立経路の fail-safe。

## Findings — 全 clean

### Wake lock (presentation)
- `navigator.wakeLock` 機能検出 + try/catch (10092–10099)
- ブラウザが tab-hide で自動解放するため、
  `visibilitychange→visible && _active` で再取得 (10100–10102) —
  プレゼン継続中のみ再アームする正しいゲート
- `release().catch()` で release rejection も安全

### Clipboard 経路
- `copyText` (7944): `isSecureContext && _nc()` ゲート →
  `writeText` try/catch → textarea+`execCommand('copy')` fallback
  (file:// / http:// 非セキュアコンテキスト=主用途 "just open it" を網羅)。
  `document.execCommand&&` で API 自体も検出。Promise<boolean> で
  全呼び出し側が `_cpT`/`_tst` 経由 toast フィードバック
- `copyPNG` (6687): `_nc().write` + `ClipboardItem` 存在検出 →
  非対応時 'copyUnsupported' toast。`.then(ok,warn)` で rejection も通知
- `clipboardData.setData` (4779): copy/cut イベント内同期呼出で
  ブラウザ保証済み — `_osCopy` は `_cpNow` 一回性フラグで制御
- `navigator.clipboard.readText` 不使用 — paste は 'paste' イベント
  の `clipboardData` 経由 (権限プロンプト不要の正しい選択)

### Error surface (設計判断)
- `window.onerror`/`unhandledrejection` は意図的に未設置 —
  静かに失敗する内部経路は全て call-site の try/catch/catch で
  捕捉済み (0814 監査)。第三者拡張由来の雑多な例外を toast 化する
  誤検知コストの方が大きいため、現状維持を記録

### Observers/beacon
- `ResizeObserver`/`IntersectionObserver`/`document.fonts`/
  `sendBeacon` 不使用 — window resize debounce (0631) +
  `img.complete&&naturalWidth` ゲート (0909) +
  `beforeunload`/`pagehide` flush (0516/0408) で代替は完備

## Verdict

再アーム網羅性・clipboard fail-safe 共に欠陥なし。監査完走のみ記録。
