# ADR-0122: 空キャンバスの dblclick でテキスト作成

## 状態

実装済み (v1.7.179)。

## 背景

dblclick はヒット形状のラベル/テキスト編集のみ — 空白を叩いても
何も起きない。Excalidraw では空キャンバスの dblclick がその点に
テキストを新規作成する定番操作。

## 決定

- dblclick ハンドラの `!hit` 分岐で `beginText(wp)` を呼ぶ —
  既存のテキスト作成経路 (snapPt + add op + `openTextEditor(s,true)`
  + pickTool('select')) をそのまま再利用。ロックガードは
  `if(hit.locked)return` として独立化 (不変条件は維持)。
- 空テキストは blur 時の既存 finalize で破棄されるのでゴミが
  残らない。

## 断念した代替案

- **専用の作成コード**: beginText と二重実装になるだけ。
- **テキストツール時のみ**: 全ツールで動く方が parity に近い
  (beginText が select に戻すので副作用も最小)。

## 影響

- 既存の「ロック形状は dblclick で編集不可」不変条件は
  `if(hit.locked)return` で保持 (presence check 更新済)。
