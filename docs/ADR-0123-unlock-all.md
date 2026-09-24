# ADR-0123: 全てロック解除 (ctx「Unlock all」)

## 状態

実装済み (v1.7.180)。

## 背景

ロックは選択単位のトグルのみ — セッションやインポートを跨いで
ロックが散在すると、一括解除は各形状を選んで回る必要がある。

## 決定

- `unlockAll()` — `state.shapes.filter(s=>s.locked)` を一括解除。
  `doLock` と同じ `align` op `dir:'lock'` の before/after 契約
  ({id,locked} の配列) で単一 undo・同期。0件なら警告のみ。
- ctx `ctxUnlockAll` — ボード上にロック形状が1つでもあれば表示
  (選択とは独立に動作)。

## 断念した代替案

- **新しい op 型**: `dir:'lock'` の before/after は既に任意の
  shape 集合を扱える — 再利用で追加実装ゼロ。
- **選択内のみ解除**: 選択経路は既存 ctxUnlock で足りる。

## 影響

- `DIRS` の 'lock' は既存 — ワイヤ形式の変更無し。
