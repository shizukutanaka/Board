# ADR-0453: 図形型メンバーシップを Set 化 + pagehide flush

- 状態: 実装済
- 日付: 2026-09-23

## 背景

1. `s.type==='rect'||s.type==='ellipse'||...` という列挙比較が 17 箇所・最大6項の
   長い `||` チェーンとして残っていた。読みにくいだけでなく、`test.mjs` の
   `html.includes` アサートが部分文字列として脆弱にマッチしていた
   (例: `type==='sticky'||type==='frame'` は `type==='text'||type==='sticky'||type==='frame'`
   の部分列としてヒットしていた)。
2. 永続化の flush は `visibilitychange` のみを信頼していたが、iOS Safari では
   スワイプ離脱・frozen-tab 退避で visibilitychange が発火しない場合があり、
   `beforeunload` も mobile では信用できない (web.dev の公式推奨は
   visibilitychange + pagehide の併用)。

## 決定

1. 形状型の列挙メンバーシップを共有 Set 定数へ畳む: `_BOX` (rect/ellipse/diamond)、
   `_BX4`、`_BOXF`、`_HF4`、`_RD`、`_RDI`、`_D6`、`_SH5`、`_TS`、`_TSF`。
   定義は `_sT([...])` + spread で合成し、~300B 回収した。
   意味も読みやすくなる (`_RDI.has(s.type)` は "角丸対象3型")。
   Set.has は O(1) で `||` チェーンと同程度かそれ以上に速い。
2. `pagehide` イベントも既存の `Persist.flushIfHidden('hidden')` 経路に流し込む —
   デバウンス cancel + dirty ゲートをそのまま再利用するため実装コストは
   イベント登録1行のみで、iOS Safari のスワイプ離脱でも最後の編集が
   IndexedDB へ flush される。

## 影響

- 17 箇所の型チェーンが宣言的になり、今後の型追加は Set 定義を直すだけで済む。
- test.mjs の脆弱な部分列マッチが新リテラル (`_HF4.has(hit.type)` 等) に同期された。
- iOS Safari での最終書き込み喪失リスクが縮小。重複書き込みは flushIfHidden が
  ゲートするため発生しない。
