# ADR-0602: wire op の図形/id 配列上限を盤面上限へ引き上げ

## 状態
実装済 (v1.7.629)

## 背景
`MAX_OP_SHAPES=500` はリモート op の配列 (del.shapes / addMany.shapes / move.ids /
style.after / align.after / group.ids・before / ungroup.ids・gids / zorder.changes /
presence ids / del.connClears) を DoS 目的で制限するガードとして導入された
(v1.7.44-46、ADR-0473/0485/0486 で順次網羅)。

しかしこの上限は**正当な一括操作を切断**していた:

- 盤面は `SHARE_MAX_SHAPES=200000` まで許容する
- 501+ 図形を含む全選択+削除、全体整列、一括 group 等の op はローカルでは
  正常に適用されるが、各受信ピアの `validRemotePayload` が `_ln <= 500` で
  当該 op **全体を棄却**する
- 送信者側は削除済み・適用済みなのに全受信者は旧状態を保持 → **無通知の永久分岐**
  (op は冪等再送されないため回復不能)

実際の DoS バウンドは op エンベロープ側に既に存在する: raw op は `_sendDC` の
256KiB 上限、巨大 op は `opc` フラグメント化され `_fragIn` の 24MB 結合上限で
受ける。つまり配列長 500 という中間点は、「バイト上限は通るが要素数で弾く」
という**暗黙で不整合な境界**を新設していただけだった。

## 決定
`MAX_OP_SHAPES` を `SHARE_MAX_SHAPES` (=200000) に変更。「1 op が触れてよい
図形数は盤面の全図形数まで」という不変条件に一本化し、配列長の上限は盤面上限、
メモリ/CPU の上限は従来通り 24MB wire バウンドが担う。定数の定義順は
`SHARE_MAX_SHAPES` 宣言の後へ移動 (TDZ 回避)。

検証:
- 501-shape addMany が applyRemote で適用される (旧: 無通知棄却)
- 200,001 要素の配列は引き続き棄却 (zorder/group/ungroup/addMany/connClears)
- `del` op で 600 shape の一括削除が実際に shapes から除去される behavioural pin

## 影響
- 501+ 図形の一括操作が同期されるようになり、大盤面での分岐を解消
- 悪意ある 200k-shape op のコストはスナップショット受信 (同規模の既存経路) と
  同オーダーで、新規の攻撃面は増えない
- 残る既知バウンド: 24MB を超える op ペイロード (200k shape の del は ~30MB) は
  wire 側で引き続き棄却 — 実用上の境界であり、これ以上は op 分割設計が必要
