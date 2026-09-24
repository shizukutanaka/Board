# ADR-0415: 選択/状態書き込み shorthand fold + fstyle/hop announce 完結

## 状態
実装済 (v1.7.450)

## 背景
round127 で ~50B まで余白が枯れ、ADR-0414 の `fstyle`/`hop` announce を
見送った。512KB 上限を維持しつつ機能追加を続けるには、まず構造的
dedupe で余白を回復する必要があった。

## 決定
ctx メニュー・選択書き込みの反復パターンを helper 化:

- `_selConnL()` — `_selAny(s=>(_conn(s.type))&&!s.locked)` (6 サイト)
- `_selTxtL()` — `_selAny(s=>(text|sticky|frame|label)&&!s.locked)` (3 サイト)
- `_selArrowL()` — `_selAny(s=>s.type==='arrow'&&!s.locked)` (3 サイト)
- `_ss(ids)` — `state.selection=new Set(ids)` (18 サイト)
- `_md(v)` — `state.dirty=v` (9 サイト)

計 ~340B 回収 → ADR-0414 で見送った `fstyle`(hatch/cross)・`hop` の
describeShape announce を追加で完結 (再録、~110B)。

## 影響
- 純リファクタ (shorthand) + SR announce 拡張 — 視覚挙動は不変。
- `state.selection` の書き込みが1箇所に集約され、将来の型変更
  (例: Set → 順序付き配列) が一括で行える。

## 断念した代替案
- `!s.locked`(56 サイト)の fold: 文脈 (forEach/フィルタ/三項) が
  多様で helper 化しても可読性が下がるだけ — 見送り。
