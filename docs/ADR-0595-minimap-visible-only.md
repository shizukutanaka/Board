# ADR-0595: ミニマップは可視図形のみ描画する

## 状態

実装済 (round304)。

## 背景

Minimap の scene 描画は `_sh()` の全図形を対象にしていた — `if(!s||s.opacity===0)continue`
のみで `visible:0` ガードがなかった。キャンバスで見えない内容がミニマップでは
0.8 alpha で描画され、さらに `_bA(shapes)` の非フィルタ包絡で scale も狂っていた。

hidden parity クラス (ADR-0576 ピア選択 / 0592 ハロー / 0593 エクスポート bbox /
0594 excalidraw) の中で最も直接的な漏洩 — 画像・テキスト含めて描かれていた。

## 決定

scene 描画の冒頭で `const shapes=_sh().filter(_sv)` — 描画対象と bbox 計算の両方を
可視図形に限定。`_sc`/`_ox`/`_oy` はこの bbox から求まるため `_mmNav` の
クリックナビ変換もそのまま整合する。

## 影響

- 非表示コンテンツがミニマップに一切描かれない (メインキャンバスと parity)。
- 全非表示の盤面では `bb` null → `_sc=0` で従来通り空表示。
- ソースピン: `filter(_sv)` が Minimap の shapes 収集に存在することを test.mjs で assert。
