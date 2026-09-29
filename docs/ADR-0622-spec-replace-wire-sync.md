# ADR-0622: spec.md の 'replace' wire 化を同期

## 状態
実装済 (v1.7.649)

## 背景
`docs/spec.md` は `replace` op を「**local 専用 = 非 REMOTE_OPS** —
悪意ある peer が盤面を消せないように」と記述していたが、ADR-0613..0619
で wire 対応済み (全置換のピア同期 + causal marker 収束系)。
設計書が現行動作と正反対の仕様を規定したままだった。

## 決定
- op 表の `replace` 行を wire ペイロード `{before,after,afterWc}` +
  `_lastRep` 全順序仲裁の説明へ更新
- MUST(受信検証) の `REMOTE_OPS` 列挙に `replace` を追加し、
  旧「local 専用」文を **'replace' の収束規則** 節に置換
  (`_lastRep`/`rep`/`nameTs` marker、undo 再ブロードキャスト、
  `Net.init` での marker リセットを一文脈で規定)

## 影響
- コード変更なし (仕様書の同期のみ)
- 「悪意 peer が盤面を消せない」という旧設計意図は、causal ordering +
  厳密検証 (validShape/clock/wc マップ) + `peerReplaced` 通知 +
  pre-swap backup で担保されている点も明文化
