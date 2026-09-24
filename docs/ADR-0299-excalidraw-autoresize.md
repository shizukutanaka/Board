# ADR-0299: excalidraw export に `autoResize:true` を emit

## 状態
承認 — round48

## 背景
excalidraw text の `autoResize` は「幅をテキストに合わせるか」
(true=auto-fit / false=固定幅で折返し)。emit していなかったため
輸出した .excalidraw を excalidraw で開くと undefined 扱いだった。

## 決定
text 要素と container text (`_ct`) の両方に `autoResize:true` を
emit — Board の text は編集後に `resizeAfterTextEdit` で常に
auto-fit されるため true が正しい意味値。

## 断念した代替案
- `s.w` がある text だけ `autoResize:false` — Board は w を持っても
  編集で再フィットするため、false は挙動を偽る。

## 影響
輸出 .excalidraw が excalidraw 現行 spec の text 契約に完全一致。
2006 全緑。
