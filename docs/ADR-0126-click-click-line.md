# ADR-0126: クリック-クリック式 line/arrow (ドラッグ不要の2点指定)

## 状態

実装済み (v1.7.183)。

## 背景

line/arrow はドラッグ限定 — トラックパッドや精密作業で、Excalidraw
式の「1クリック目で始点、2クリック目で終点」が無い。

## 決定

- ドラッグが <2px の pointerup で `ptr.lineClick` を arm し、ドラフトを
  保持 — その後の pointermove で `contLineLike` がプレビュー (⇧の
  角度拘束も効く)、2クリック目の pointerdown で `endLineLike` が
  通常のコミット経路 (結合先バインド含む) を通す。
- キャンセルは3経路: Esc / pointercancel / ツール切替
  (pickTool で line/arrow 以外を選択)。

## 断念した代替案

- **ドラッグと排他モード**: ドラッグ従来通り — ゼロ距離 up だけが
  click モードに入るので両立 (Excalidraw と同じ挙動)。
- **連続セグメント連鎖**: Excalidraw は3点目以降も継続できるが、
  Board は1本ごとに select 復帰する既存コミットを再利用 — 連鎖は
  後続検討。

## 影響

- `endLineLike` のコミット/バインド/undo は無変更で再利用。
- ⇧拘束はプレビュー中の最後の move 状態で確定 (ドラッグ版と同じ
  タイミングモデル)。
