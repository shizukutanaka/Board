# ADR-0434: prop read fold 第2弾 (`_rt`/`_du`/`_gi`)

## 状態
実装済 (v1.7.469)

## 背景
ADR-0433 に続き、read 頻度の高い `s.rotate` (31 サイト)、`s.dataUrl` (22)、
`s.groupId` (25) を shorthand 化。

## 決定
`_rt=s=>s.rotate`、`_du=s=>s.dataUrl`、`_gi=s=>s.groupId` を追加 — read
site のみ fold。`s.X=`、`delete s.X` (参照が要る — `delete _gi(s)` は
無効)、`s.labelPos` 系別識別子、他レシーバは lookaround で除外。
`delete s.X` の混入は実害が出たため明確に保護対象に追加。
計 ~130B 追加回収 → 余白 ~240B。

## 影響
- 振る舞い不変。`s.opacity`/`s.valign`/`s.align`/`s.text`/`s.fill` 系の
  小粒 prop は 1-2B/site のため見送り。
- `_op` は 6507 のローカル変数と衝突するため `s.opacity` 自体も見送り。
