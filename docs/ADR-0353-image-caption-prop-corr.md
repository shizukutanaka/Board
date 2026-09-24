# ADR-0353: 画像キャプションの実 prop は `s.label` — ADR-0351/0352 の訂正

## 状態
承認 — round81 (ADR-0351/0352 上書き)

## 背景
ADR-0351/0352 は `s.cap` を画像キャプションの実 prop と仮定したが、
実際の描画経路 `_drawImgLabel` (ADR-0083) は `s.label` を読み、
`s.cap`/`s.frameLabel` はコードベースどこにも setter/render を
持たないファントム prop だった。結果として bCap 経路は dead
code、drawio import の cap 化は「不可視 prop への再マップ」を
別の不可視 prop へ移しただけだった。

## 決定
- `s.cap`/`s.frameLabel` の参照を全撤去 (検索・emit・import)。
- exc emit: 画像 `s.label` → 下端帯の bound text + `bLabel:1`
  → 往復で `p.label` 復元し `_drawImgLabel` が描く帯と一致。
- drawio emit: `value=s.label` + `verticalAlign=bottom`。
- drawio import: `shape=image` の label は `s.label` (ADR-0352 を
  revert — label こそが caption 帯の実 prop)。

## 影響
net -195B (522,777B)。画像キャプションが Board↔exc↔drawio で
往復する本来の挙動を実現。2044 全緑。
