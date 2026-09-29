# ADR-0589: コネクタ束縛×変換の不変条件を文書化しピンで固定する

## 状態

実装済 (round298)。docs + テストのみ (index.html は version 以外無変更)。

## 背景

ADR-0583〜0588 でコネクタの位置依存 prop (`aF`/`bF`/`labelPos`/`cbend`/`bend`/`way`) が
全変換経路 (translate / flip / reverse / doRotate / grot / gresize) で正しく変換されるよう
修正・確認してきた。しかしこの不変条件はコードの各所に散在し、将来の変換経路追加
(例: skew、自由変形、ペースト時変換) がアンカーを壊すリスクがある。

## 決定

- `architecture.md` に「コネクタ束縛と変換」節を新設 — prop × transform の不変条件行列
  + `connClears` (結合先削除時の清書) + 選択外コネクタの before/after 同梱規則。
- `test.mjs` に9件のソースピン — 各変換経路のリマップ実装が存在することを assert。

## 影響

- リグレッション防止: 変換経路を新設してアンカー処理を忘れてもピンが検出する。
- レビュー容易性: prop 意味論が一箇所に集約された。
