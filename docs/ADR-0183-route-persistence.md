# ADR-0183: コネクタルートの last-used 継承

## 状態

実装済み (v1.7.241)。

## 背景

ctx「エルボー」「曲線」で設定したルートスタイルは選択中のコネクタ
にしか残らない — フローチャートで何本もエルボー接続を引く時、
毎回 ctx 切替が必要だった。draw.io は辺スタイルを継承する。

## 決定

- `toggleElbow`/`toggleCurve` が適用結果を `state.style.elbow`/
  `state.style.curve` に記録 (最後にパッチされた図形の値)。
- `Shape.make` が `line`/`arrow` 作成時に継承 — 引き/クリック-
  クリック/quick-connect/connectSelection の全経路で有効。
- `resetRoute` (ルートをリセット) は記録も 0 にクリア — 「直線に
  戻す」を選んだ後の新規コネクタは直線に戻る。

## 断念した代替案

- **elbow/curve を draft 生成点のみで継承**: Shape.make に載せる
  方が全生成経路を一律にカバーできる。

## 影響

- `elbow`/`curve` を一度も切り替えていないセッションでは不変
  (`0` は falsy で継承されない)。
