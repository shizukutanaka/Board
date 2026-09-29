# ADR-0471 — frac キーの深さ compaction

## 状態

実装済 (v1.7.504)

## 背景

`keyBetween` の挿入キーは「同一 gap への連続挿入」で深さが増す — 典型的には ~62 挿入ごとに1文字伸長 (対数) だが、敵対的な front/back 交互操作では線形増大も起こり得る。リモート側の `validPatch` は `frac` 文字列を 600 文字で棄却するため、**キーが 600 超の図形の z-order op は静かに棄却されピア間で発散**する。またキー長は wire サイズと比較コストも増やす。compaction 契機は従来存在しなかった (legacy 移行時の `reindexFrac` のみ)。

## 決定

`_zCommit` で `after` キーが 48 文字を超えたら `reindexFrac()` (全図形を配列順の正規キーで再採番 — keyBetween の prefix-stable 性により破壊的でない) を発行し、`changes` を全図形の `{id,before,after}` で再構成して同じ zorder op で送出。undo は既存経路で before に戻る。併せて `doBringFront`/`doSendBack` の共有プリアンブル (`ids`→`sel`→`selShapes` 抽出) を `_zSelShapes` に畳み込み (~150B 相殺)。

## 影響

- frac キー長は 48 で上限化 — wire 肥大化と 600 文字超の静寂な発散を構造的に防ぐ。
- `before` は pre-reindex の各図形キーを保持し undo も正確。
