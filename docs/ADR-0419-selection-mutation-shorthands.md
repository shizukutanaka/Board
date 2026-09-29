# ADR-0419: 選択 Set 変更系 shorthand (`_scl`/`_sad`/`_sdl`)

## 状態
実装済 (v1.7.454)

## 背景
選択集合の mutation は `_sl().add/delete/clear` の3形で ~38 サイト —
`_ss` (置換) と並ぶ、selection への書き込み経路の残り。

## 決定
- `_scl()` — `_sl().clear()` (21 サイト)
- `_sad(id)` — `_sl().add(id)` (12 サイト)
- `_sdl(id)` — `_sl().delete(id)` (5 サイト)

test.mjs のリテラル同期 5 件も更新。

## 影響
- 純リファクタ (~120B 回収) — 挙動不変。
- これで selection の write 経路は `_ss`/`_scl`/`_sad`/`_sdl` の4系に
  完全集約 (`_sl()` は read のみ)。

## 断念した代替案
- 選択操作を全て `_ss(…)` 置換に統一: add/delete は Set への in-place
  変更が semantically 正確であり (置換 Set 生成は GC 負荷が増す)、
  現状の細粒度 helper を維持した。
