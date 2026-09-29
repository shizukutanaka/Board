# ADR-0653: zorder の frac を per-shape LWW で収束

## 状況
research-improvements.md の op 棚卸し表で `zorder` は「frac スナップショット:
△ 未 LWW」と残課題だった。実害シナリオ: ピア A が図形 X を最前面へ、ピア B が
同時に同じ X を別位置へ並べ替える — 各 op は `sh.frac` を無条件で上書きする
ため、到着順で勝者が変わり、A には B の順序・B には A の順序が残ったまま
**永久に発散**する (frac は収束する設計だが「書き込み仲裁」が無かった)。

## 決定
`frac` を LWW 系 (wclock) の対象プロパティに加える:

- `_lwwOp` に `zorder` を追加 — 時計の記録・フィルタ対象に含める。
- `_lwwDrop` (リモート適用前フィルタ): `changes` 形式を専用分岐で処理 —
  `clockNewer(op.clock, wc[id].frac)` を満たすエントリのみ残す
  (before/after が frac 文字列のため汎用パッチ経路には乗せられない)。
  legacy `after` スナップショット形式は pre-Step2 のピア由来で時計が無いため
  従来どおり無条件適用。
- `_stampWrites`: `changes` の各エントリで `wc[id].frac = op.clock` を記録 —
  ローカル/リモート双方の書き込みが同一の仲裁テーブルを通る。
- `_apply` の `changes` パスに `_lwwSkip` ゲート — undo (backward) が
  収束済みの新しいリモート書き込みを退行させない。

## 効果
同一図形の並行 reorder は `clockNewer` の全順序で一意の勝者に収束。
異なる図形への reorder は非競合のまま。スナップショットマージ経路
(`_mergeSnapshotOp` の per-prop LWW) も `frac` の時計が載るようになったため
同じ仲裁に自然に乗る。

## 非目標
`del`/`add` の存在レベル因果 (再出現)、legacy after 形式の LWW 化
(発行者がいない) — 棚卸し表の残課題は `del` 系のみ。
