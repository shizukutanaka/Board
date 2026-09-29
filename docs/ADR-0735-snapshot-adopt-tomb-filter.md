# ADR-0735: snapshot の一括採用も墓標フィルタ (empty-board 復活経路の閉塞)

## 背景

ADR-0734 で del が `_wc()[id]={_del:op.clock}` の墓標を残し、'add'/'addMany'/snapshot-union-heal の push 経路は墓標ゲートで覆った。ただし残存経路が2箇所あった:

1. **`_applySnapshot` の wholesale adopt** — `_nS()===0` (受信側の盤面が空) の場合、`_mergeSnapshotOp` を経由せず `_rs(clone(valid))` で全置換する。墓標を一切参照しないため、**del で全消去した直後に del 前の snapshot が到着すると、墓標済み図形が一括復活**し、送信側が del を適用しても受信側だけが図形を保持 = 発散。
2. **pageAdd メンバーの墓標クリア欠落** — 'add' は勝利時 `delete wd._del` するが、pageAdd メンバーループは墓標ゲートで弾くだけで tomb を残していた。push 自体は正しいので発散はしないが、後続の snapshot/adopt で「最後の存在判定=削除」が残り続ける非対称。

## 決定

- `_applySnapshot` の採用フィルタを `validShape(s)&&!(_wc()[s.id]||{})._del` に変更。残留 `_del` は「最後に観測した存在判定が削除」という意味なので、順序根拠を持たない (op の `ts:0` 時計は必敗) snapshot に刈り取らせる。
- pageAdd メンバーループに `if(wd)delete wd._del` を追加し 'add' と parity。

## 誤検討した代替

- **墓標の `_del` 時計と比較する**: snapshot の per-shape op 時計は `ts:0` で順序情報を持たず、比較は常に tomb 勝ちになるため実質「存在すれば落とす」と同値。存在判定で十分。
- **新規 joiner への影響**: tomb を持つのは実際に del を観測したピアのみ。fresh joiner は墓標を持たないので採用を妨げない。送信側が del をまだ見ていない場合は del が後続で届き両者「削除」に収束。

## 検証

test.mjs に 6 件追加: 未知 id への del が墓標化 (del-first ordering)、merge-path snapshot が墓標済み図形を復活させない、wholesale adopt が墓標済み id を落とす、新しい add は墓標に勝つ、pageAdd メンバーの勝利時 tomb クリア。
