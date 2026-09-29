# ADR-0625: `_slimOp` が wire op から undo 専用フィールドを剥がす

状態: 実装済 (v1.7.652)

## 背景

`_slimOp` は画像参照の slim 化のため `add`/`addMany`/`del`/`clear`/`replace` を個別処理するが、それ以外の op はそのまま `return op` で通過させていた。結果、undo ドメイン専用のフィールドが wire に載っていた:

- `wc` — `del`/`clear` の backward が wclock を復元するための clock マップ。受信側の `_apply` forward は**自前で `op.wc` を再構築**するため送信値は完全なデッドウェイト (500 図形の一括削除で ~15KB 超の無駄)
- `origSel` — `_selR` が backward のみで読む選択復元フィールド。`ungroup`/`beautify` が op リテラルに内包するため wire に漏洩 (選択 id リストは presence で既に共有されるが、op とは無関係の混入)
- `moved` — ADR-0548 の locked-move undo 補助フィールド。受信側 `_apply` が `op.moved` を再構築するため同じくデッドウェイト

ピアはこれらを一切読まない (`_selR`/`wc` 復元は backward 専用、リモート op は undo 履歴に入らない)。

## 決定

- `del`/`clear`/`addMany` の wire コピーから `wc`/`origSel` を剥離 (`connClears` は remote が必要とするため保持)
- 残りの全 op (move/style/upd/align/…) を `const{origSel,moved,...rest}=op;return rest` で通過

`validRemotePayload` は構造を検証し余剰フィールドを無視するため後方互換 — 旧バージョンピアが送る同フィールドはそのまま許容する。

## 影響

- 一括削除の wire ペイロードから clock マップ分 (~30B/図形) を削減
- 選択 id の意図しない op 混入を遮断 (semantic leak)
- テスト: `Net._slimOp` が wc/origSel/moved を除去し connClears/dx/dy を保持する挙動アサート + ソースピン
