# ADR-1161 — ドロップ標的は window 全体: chrome 上でのナビゲーション抑止

## 状態

採用 (2026-10-01, v1.8.185)

## 文脈

ドラッグ&ドロップ監査の発見。`dragover` / `drop` リスナーは **canvas 要素にのみ**
登録されていた。ブラウザの既定動作では、preventDefault されない `drop` は
「ファイルを新しいタブ/同一タブで開く」= **アプリからのナビゲーション離脱**。

クリティカルな区画:

- toolbar / topbar / statusbar / page-strip / stylePanel / minimap / toasts —
  キャンバス外の chrome 領域はかなりの面積を占め、特に **stylePanel (右カラム)**
  はドロップしやすいターゲット。
- `.board` / `.excalidraw` / `.drawio` / `.svg` / 画像をこれらの上にドロップすると
  インポートされないどころか、ブラウザがそのファイルへ遷移して Board が閉じる。
  IDB 永続化で内容は失われないが、セッション中のピア接続・undo 履歴・ジェスチャは
  全て失われる。

## 決定

リスナーを `canvas` から `window` へホイストし、3 つのゲートを追加:

```js
_on(window,'dragover',e=>{_pd(e);e.dataTransfer.dropEffect='copy'});
_on(window,'drop',e=>{
  if(!_ln(e.dataTransfer.files)&&e.target?.matches?.('input,textarea'))return;
  _pd(e);
  if(_pA())return;
  // ...既存の import cascade (.board → .excalidraw → .drawio → .svg → image → text)
});
```

- **`dragover` は全域で `_pd`** — ナビゲーションの発生点は drop 側だが、
  dragover でも抑止しないと dropEffect が 'none' になりドロップ自体が成立しない
  環境があるため両方抑止 (既存動作の拡張)。
- **テキストドロップの input 保持** — `input/textarea` への *ファイルを含まない*
  ドロップは早期 return (native のテキスト挿入を維持)。`_pd` しないので
  sqinput/RTC ペースト欄への選択テキスト drag&drop が壊れない。
  ファイルを含むドロップは input 上でも import cascade へ進む
  (= ファイルを input に落としても開かず import される)。
- **`_pA()` ゲート** — プレゼンは view-only (ADR-0640 parity)。`_pd` で
  ナビゲーションは抑止しつつ import は走らない。

`_o2w(e)` の座標変換は clientX/Y → viewport → world なので、chrome 上のドロップも
「その画面位置に対応する world 座標」へ着地する — 視覚的に自然な振る舞い。

## 検証

4 ピン (test.mjs ADR-1161 ブロック):

1. ソースピン — リスナーが window にあり canvas には無い。
2. chrome ターゲットへのテキストドロップが cascade に到達 (text shape 生成)。
3. input へのテキストドロップは `_pd` も cascade も走らない (native 維持)。
4. pres 中のドロップは `_pd` されるが import されない (view-only 維持)。

既存の drop ピン (ADR-0518/0273/0044/0203 等 11 サイト) は dispatch 先を
`canvas._L` → `fakeWin._L` へ再校正。

## 残リスク / YAGNI

- モーダル (share/help) 表示中のドロップは import が走る — 動作的に問題なく
  ゲートは未導入 (裏側での import は正しい挙動)。
- RTC textarea 上へのファイルドロップは import される (textarea 入力にならない) —
  ナビゲーションより明確に良い。
