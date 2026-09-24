# ADR-0490: `_ss([id])` — `_scl();_sad(id)` の単一 id selection 集約

## 状態

実装済 (v1.7.523)

## 背景

図形追加直後に選択へ一括置き換える `_scl();_sad(id);` (clear + add) が
6 サイトに複写 — image paste×3、pen/text end×2、frame wrap×1。

## 決定

`_ss([id])` (selection-set write、ADR-0415 で既存) に置き換え — Set の
中身置き換えと等価 (新 Set 代入の方が old Set への参照拡散も避けられる)。

## 影響

- index.html −36B (523,231 → 523,195)
- 動作変更なし
