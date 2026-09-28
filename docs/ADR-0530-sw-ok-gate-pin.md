# ADR-0530: SW ok ゲートのピン追加

## 状態

実装済み

## 背景

ADR-0529 で SW の両 `c.put` を `n.ok` ゲートにしたが、ピン未整備だった —
将来のリファクタで `c.put(e.request,…)` 直書きに戻るとエラー応答の
キャッシュ混入が静かに復活し得る。

## 決定

test.mjs にピンを追加: `if(n.ok)c.put(e.request,n.clone())` と
`e.request.method==='GET'&&n.ok` の 2 リテラルを要求。テストのみ、
index.html へのバイト変化なし。

## 影響

- 2082→2083 pass。ランタイム変更なし
