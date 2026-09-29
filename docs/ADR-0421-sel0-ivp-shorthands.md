# ADR-0421: `_sel0`/`_ivp` shorthand + `_selAny`/`unlockedSelectionIds` 重複解消

## 状態
実装済 (v1.7.456)

## 背景
- `byId(_selIds()[0])` が 12 サイト — 単一選択 shape 取得の反復。
- `_selIds().some(id=>byId(id)?.X)` が 4 サイト — `_selAny(f)` と
  完全等価 (byId+truthy guard) なのに素形で書かれていた。
- `unlockedSelectionIds()` 本体が別箇所にインライン複写。
- `_iv();_ps()` の末尾接尾辞が 9 サイト。

## 決定
- `_sel0()` — `byId(_selIds()[0])` (12 サイト)
- `_ivp()` — `{_iv();_ps()}` (9 サイト)
- `_selIds().some(id=>byId(id)?.X)` → `_selAny(s=>s.X)` (4 サイト)
- `_selIds().filter(id=>{…!locked})` → `unlockedSelectionIds()` (1 サイト)

## 影響
- 純リファクタ (~280B 回収) — 挙動不変。
- `_selAny` が `_some` 素形を吸収し、predicate の表記が一貫。

## 断念した代替案
- `_iv();_o(m)` 等の他接尾辞: 赤字になる組合せは除外済み。
