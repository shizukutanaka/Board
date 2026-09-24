# ADR-0364: `_sh()` live-read shorthand for state.shapes (~1KB 回収)

## 状態
承認 — round88

## 背景
`state.shapes` は 152 箇所で参照される 12 文字識別子。
`state.viewport` と同様、呼び出し側が配列ごと差し替える
(`state.shapes=valid.map(clone)` 等) ため参照エイリアスは不可。

## 決定
`const _sh=()=>state.shapes` — 関数形 live-read。
`_sh().find/_sh().length/_sh().push/[..._sh()]` 等に展開。
**配列ごとの代入 (`state.shapes=` / `state.shapes.length=`) は literal の
まま残す** (関数呼出しの左辺代入は不可のため)。152 箇所変換、5 箇所保持。

## 影響
-~1KB。2044 全緑。
