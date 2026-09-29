# ADR-0482: `_ctrAt` — import 中央配置ブロックの集約

## 状態

実装済 (v1.7.515)

## 背景

`.board` / .excalidraw / .drawio の3つの import 経路に、同一の「wp (ドロップ点/ビューポート
中央) へ shapes を平行移動」ブロックが複写されていた:

```
wp=wp||_midV()
const bb=_bA(shapes);
if(bb){const dx=wp.x-(bb.x+bb.w/2),dy=wp.y-(bb.y+bb.h/2);
  for(const s of shapes)Shape.translate(s,dx,dy)}
```

## 決定

`_ctrAt(ss,wp)` に集約 — 引数 `wp` は呼出し側のローカルを null 許容で渡し、
helper 内部で `wp||_midV()` に既定化 (呼出し側は `_vpNull` で「ファイル viewport を採用
するか」を別途保持するため、wp の外部書き戻しは不要)。

## 影響

- index.html −108B (523,594 → 523,486、余白 ~802B)
- 動作変更なし
