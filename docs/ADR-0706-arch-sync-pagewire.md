# ADR-0706 — architecture.md への改名/削除収束規則の同期

## 状態
採用 (v1.7.732、docs のみ)

## 文脈
ADR-0698–0705 で pageName/docName の改名 LWW・undo ゲート・remote 適用規則・
wire slimming が固まったが、architecture.md のマルチページ節は
`pageName は p.nts の LWW` という一行のままだった。

## 変更
- 同節へ「改名/削除の収束規則」を追記:
  - (ts,peer) 全順序 LWW (page `nts`/`ntp`、docName `_nameTs`/`_namePeer`)
  - 非有限 ts の一律棄却 (NaN/Infinity による永久凍結防止)
  - undo ゲート = 現行書込が自身の op と比較して新しくない場合のみ復元
  - `<2` ガードはローカル限定、remote 最終 del は空集合化で収束
  - wire pageAdd の `op.i` 位置復元、wire の適用フィールド最小化
