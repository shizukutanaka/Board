# ADR-0611: ポインタがキャンバスを離れたらピアカーソルを隠す

## 状態
実装済 (v1.7.638)

## 背景
ADR-0526 でローカルの `pointerleave` は laser/hover を消すが、ピアへの
カーソルは**最後に受信した位置で描画され続ける** — 送信側のポインタが
画面外に出ても `p.cursor` は残り、リモート盤面に凍結カーソルが残存する
(ピア切断まで消えない)。Figma/Miro では leave で非表示化する。

## 決定
- `Net.sendCursorHide()`: `_mk('cursor',{x:0,y:0,h:1})` を送出。
  throttle をバイパスしつつ `_lastCursorSend=0` に戻すので、
  再入時の最初のカーソルが即座に届く
- 受信側 `case 'cursor'`: `msg.h===1` なら `p.cursor=null`
  (数値検証は実座標のみに適用、先行して h 判定)
- `canvas` の `pointerleave` で `Net.sendCursorHide()`

後方互換: 旧ピアは `h` を知らず x:0,y:0 の検証を通って座標 (0,0) に
ジャンプするだけ — 実害はなく次のカーソルで上書きされる。

## 影響
- リモート盤面の凍結カーソル解消 (切断まで残っていた)
- wire 変更は cursor op に `h` フラグ追加のみ (後方互換)
