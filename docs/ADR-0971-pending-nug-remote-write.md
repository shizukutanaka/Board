# ADR-0971: pending `_nug` 復元ドメインの remote 書込マージ

## Context

ADR-0969 はポインタジェスチャ orig (`dragStartShapes`/`resizeOrig` 等) への
`_gTouch` マージで「mid-gesture remote 書込が orig-restore に巻き戻される」
発散を閉塞した。しかし `_nug` (キーボードナッジや `[ ]`/`⌘G` 等の長押しを
400ms trailing で1 op に共合する機構) の `_nugLock` も同型の復元ドメインを
持つ: `op.orig` (move)、`op.before` (style/group/align)、
`op.changes[].before` (zorder) は全て arm 時のクローンで、`_gTouch` は
`ptr.down` でゲートされこれらを一切触れなかった。

発生シーケンス: ナッジで `_nug` armed (A.x: 100→105) → remote `move` が
A を 500 へ → remote `locked` が着地 → `_nugEnd` の `_nugLock` が locked
メンバーを `orig` へ復元 → **local だけ A.x=100 に巻き戻し、peer は 500**
→ 恒久発散 (wclock は remote clock を保持するため再 heal もしない)。

## Decision

1. `_gTouch(id,ks)` を `_nug` 復元ドメインへ拡張: `_nug` armed 時は
   `op.orig[id]` / `op.before` 内エントリ / `op.changes` 内エントリ
   (frac のみ) へ live 値を書き戻す。`ptr.down` なしでも動作
   (キーボードセッションはポインタジェスチャではない)。
2. `_oa` の `ptr.down&&` ゲート撤去 — `_gTouch` が内部で自給ゲートするため
   `byId(o.id)===o` のみ残す。
3. `zorder`/`group`/`ungroup` の適用サイトにも `_gTouch` を追加 —
   `frac`/`groupId` は `_geoR` キー外だが pending op の before/after が
   これらを抱える。
4. remote (re)birth は `_bT` で `_nug.reborn` (到着順 Set、0970 parity)
   へ刻印し、`_nugLock(op,rb)` が `rb.has(id)` で復元スキップ+op から除外
   — arm 値の復活で remote 再誕生を clobber しない。

## Consequences

- 「remote 書込は restore に巻き戻されない」がジェスチャ/pending 両系で
  統一の不変条件になった。
- ローカル産生値 (`c.peer===_pi()`) の復元契約 (0964/0965) は不変。
- サイズ: +~240B 実装、~600B コメント圧縮で相殺。
