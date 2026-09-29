# ADR-0053 — テキストエディタの pan/zoom 追従

## 状態

実装済み (v1.7.111)

## 背景

`openTextEditor` が作る `<textarea>` オーバーレイは DOM アンカー —
`positionTextEditor` が開いた瞬間の `w2s` 座標で `left/top` を一度だけ
書く。ユーザーが編集を閉じずにホイールパン・ctrl+wheel ズーム・ドラッグパン
・ミニマップスクラブで viewport を動かすと、下の図形は移動するのに
テキストエリアは画面固定のまま取り残される。`docs/audit-2026-06.md`
の残課題 (テキスト編集中の pan/zoom 追従) として挙がっていた既知の欠陥。

## 決定

オーバーレイ参照をモジュール変数 `_teTa` に保持し、`frame()` の最後で
`_teFollow()` を走らせる。viewport 署名 (`x,y,zoom` の連結文字列) が変わった
時だけ `positionTextEditor` を再実行 — 毎フレームの no-op 判定は O(1)。

```js
let _teTa=null, _teVp='';
function _teFollow(){
  if(!_teTa||!state.editing)return;
  const s=byId(state.editing);if(!s)return;
  const v=state.viewport,sig=v.x+','+v.y+','+v.zoom;
  if(sig===_teVp)return;
  _teVp=sig;positionTextEditor(_teTa,s);
}
```

- `openTextEditor` 末尾で `_teTa=ta`、blur コミットで `_teTa=null`。
- `positionTextEditor` は既存のまま (fontSize の zoom 乗算でズーム時の
  テキスト見た目サイズも一致)。
- `frame()` に置く理由: viewport 変更の全経路 (wheel/zoomAt/drag-pan/
  minimap/keyboard zoom) が invalidate() → frame() を通るため、呼び出し
  サイトを列挙せず一箇所で追従できる。ADR-0011 / ADR-0041 と同じ
  「frame 境界で追従」パターン。

## 断念した代替案

- **各 viewport 変更サイトで再配置を呼ぶ**: 十数箇所あり忘れ物が起きる。
- **編集中のパン禁止 / パン時にコミット**: 入力を中断させるのは優しく
  ない。Excalidraw 同様、パン・ズーム中も編集を継続できる方が自然。
- **pinch/wheel プレビュー中も追従**: ADR-0030/0033 のスナップショット
  blit は viewport を実際には変えないため署名が動かず追従しない —
  ジェスチャ確定時に正しい位置に戻る。一時的なラグは許容範囲。

## 影響

- 新 op なし、描画経路に render 副作用なし (style 書き込みは DOM、canvas 外)。
- blur コミットの位置ではなく shape の座標で配置されるため、パン後の
  blur も正しい shape に対して commit される。
- テスト: presence 2 件 + 実動作 (初期配置・zoom 追従・pan 追従・署名
  no-op・編集終了後の no-op)。
