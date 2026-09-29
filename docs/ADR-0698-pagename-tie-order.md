# ADR-0698 — ページ名 LWW の同時刻タイを (ts, peer) 総順序で収束

## 状態
採用 (v1.7.724)

## 文脈
`pageName` op の LWW は `ts>=p.nts` で、union-heal 側は `(p.nts||0)>(l.nts||0)` —
どちらも**同時刻リネームの勝者を一意に決められない**:
- op 経路 (`>=`): 両ピアとも相手のリネームを適用 → A は B の名、B は A の名で発散
- heal 経路 (`>`): 両方とも拒否 → 各々自分の名を保持して発散
さらに3者以上の同時リネームでは、受信側は現在位の**書込者**を知らないと順序を
決定できない (shape 側 wclock と同じ問題、ADR-0614 と同型)。

## 変更
- ページレコードに `p.ntp` (最終書込 peer) を追加。pageAdd/heal で生成する
  `{id,name,nts:0}` は `ntp` 省略 (=`''` → 全実 peer に負ける最低位)
- `_apply` forward: `p.nts==null || clockNewer({ts,peer,seq:0},{ts:p.nts,peer:p.ntp||''})`
  で受理。backward (undo) は従来通り `ts>=p.nts` で before を復元し、`op.btp` で
  ntp も戻す
- snapshot union-heal: 同じ `clockNewer` 比較に統一 (異種経路間の順序ずれ解消)。
  `ntp` は `_iS` 検証してから書込 (細工された非文字列値の凍結防止)

## 検証
- 同時刻タイの高 peer 勝ち/低 peer 負け/中位 peer 負けの3アサート + 新規勝者受理
- テスト側の注意: 未来 ts の remote は `state._lastTs` (HLC floor) を押し上げるため
  リセット必須 (実害: 後続 local commit が全て未来 clock に)
