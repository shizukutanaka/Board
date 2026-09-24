# ADR-0423: frame 拡張 `_frameOf`/`_xFS`/`_grpOf` fold + `map(clone)` 正規化

## 状態
実装済 (v1.7.458)

## 背景
frame 内包による選択拡張ロジックが delete/move/flip/rotate の 4 箇所に
完全重複 — 構築ループ (childId→frameId map、~250B×4) と展開ループ
(`!sel.find` push、~105B×4) の両方。rotate 経路のみ子の filter が
`_rotatable` 条件付きの1点差。

## 決定
- `_frameOf(sel,ok)` — containment map の構築を集約、`ok` predicate で
  rotate の `_rotatable` 子フィルタに対応 (他サイトは省略)
- `_xFS(sel,frameOf)` — map からの選択拡張を集約
- `_grpOf(gid)` — groupId メンバー id リスト (`_sh().filter().map` ×2)
- `map(s=>clone(s))` → `map(clone)` — `clone` は第1引数のみ使用、
  map の追加引数は無害 (10 サイト)

## 影響
- 純リファクタ (~800B 回収、headroom ~1.1KB) — 挙動不変。
- frame 拡張ロジックが単一変更点化 — 今後の frame 拡張変更が
  4 箇所ずれ修正のリスクから解放。

## 断念した代替案
- `_frameOf` 自体の `_gridVer` メモ化: 呼び出しが op 起点で稀で
  構築コストが小さい — 追加キャッシュは不釣合い。
