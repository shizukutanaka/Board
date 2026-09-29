# ADR-0182: ラベルエディタの viewport 追従

## 状態

実装済み (v1.7.240)。

## 背景

ADR-0053 でテキストエディタ (textarea) は `_teFollow` で pan/zoom に
追従するようになったが、ラベルエディタ (input — ボックス/フレーム/
コネクタ/画像ラベル) は固定配置のまま — 編集中に盤面が動くと
入力が宙に浮いた。

## 決定

- アンカー位置計算を `_lblAnchor(hit)` に抽出 — 開く時と追従時で
  同一ロジックを再利用 (frame 上端 / box 中心 / コネクタ labelPos /
  画像下端)。
- `openLabelEditor` が `{inp,hit}` を `_lblTa` に登録し、commit/
  Escape で解除。`frame()` 内の `_lblFollow()` が viewport 署名の
  変化時のみ再配置 (`_teFollow` と同一パターン)。

## 断念した代替案

- **pan/zoom 中は編集をブロック**: `_teFollow` で既に確立した
  追従方式の方が UX が一貫。

## 影響

- 編集中に盤面が動かない場合は不変。コミット経路は既存のまま。
