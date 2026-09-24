# ADR-0416: dead-code sweep — SNAP_THRESHOLD 削除 + `_setSq`/`_ss` 活性化

## 状態
実装済 (v1.7.451)

## 背景
定義名の参照カウント走査で `SNAP_THRESHOLD` が定義のみ (未使用の dead
const) と判明 — オブジェクトスナップは `SNAP_OBJ`/`_snapBoxIdx` 系で完結
しており、旧しきい値が残骸として残っていた。併せて `_setSq` が
テスト公開のみで、本体 `_sq=v; _sqNav.idx=-1; _sqNav.lastQ=''` が
production コードに 3 箇所インライン複写されていた。

## 決定
- `SNAP_THRESHOLD` 削除 (-37B)。`snapBox` は test 公開 API として維持。
- `_setSq` を実使用へ: input ハンドラ + Escape/選択確定の3クリア経路を
  集約 (nav reset 込みで等価)。
- `state.selection=inv|inner` の直接 Set 代入も `_ss()` に統一 —
  参照共有より `new Set()` コピーの方がエイリアス安全で、書き込み経路が
  単一化する。

## 影響
- 純リファクタ + dead code 除去 — 挙動は不変。~146B 回収。
- 検証: 469 定義名の参照カウントで dead 上位3件を確認後適用
  (`snapBox`/`_setSq` は test 公開なので「def のみ」でも生存扱い)。

## 断念した代替案
- `!s.locked` 系の fold: 前項同様、文脈多様で可読性が下がるため見送り。
