# ADR-0350: `_qsa`/`_JS`/`_JP` shorthand による raw 回収 (~400B)

## 状態
承認 — round78

## 背景
512KB 上限対策の継続。ADR-0348 の `_rnd`/`_qs` に続く第二批。

## 決定
- `_qsa=(e,s)=>e.querySelectorAll(s)` (21箇所)
- `_JS=JSON.stringify` (23箇所) / `_JP=JSON.parse` (8箇所)
- SW blob 内に JSON 使用が無いことを確認済み。
  querySelectorAll は NodeList を返すため `[... ]` 展開は
  呼び出し側のまま (insert 語彙を変えない)。

## 影響
raw 522,499B (余白 ~3.8KB)。挙動不変。2044 全緑。
