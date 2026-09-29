# ADR-0716 — move/group/ungroup/zorder backward も locked skip

## 状態
採用 (v1.7.742)

## 文脈
ADR-0712 の網羅監査: `!(forward&&sh.locked)` 形のゲートは backward で
`!false` に評価され素通りだった。forward↔undo 間に lock が届くと
ローカルの undo だけ位置/groupId/frac を書き戻し、ピアは undo-wire
op を locked skip で棄却 = props 発散。

## 変更
- `move` (`sh.locked` 両方向 — `op.moved` 記録は残るが backward でも skip)
- `group`/`ungroup`/`zorder` (frac/z の legacy snap 経路含む) を両方向ゲートへ
- これらの op は `locked` を patch に持てないため、backward の
  'locked' in raw 例外は不要 (style 系との違い、ADR-0712 参照)
