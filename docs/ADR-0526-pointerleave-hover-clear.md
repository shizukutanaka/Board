# ADR-0526: pointerleave で `state.hover` をクリア

## 状態

実装済み

## 背景

`state.hover` は pointermove で追跡される hover 図形 id で、quick-connect
ドット (ADR-0070) の描画ソース。`pointerleave` ハンドラは `_laser` のみ
消していて hover を残していた — ポインタがキャンバスを離れた後も
最後にホバーした図形 (端にあったもの) のドットが描画され続けていた。

## 決定

`pointerleave` で `state.hover=null` + `_ivO()` (laser と同じハンドラ内)。

## 影響

- 滞留ドットの消去
- +~50B、ピン1件追加、test.mjs 2080 全緑
