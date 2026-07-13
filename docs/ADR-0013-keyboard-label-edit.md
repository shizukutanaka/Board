# ADR-0013 — ラベル/テキストのキーボード編集経路 (Enter キー再利用)

- Status: Accepted (implemented)
- Date: 2026-07-13
- 関連: `docs/feature-backlog.md` FT-19、ADR-0003(コネクタラベル)、
  `openLabelEditor`/`openTextEditor`(既存のインライン編集器)

## なぜ (Context)

v1.7.63 の UX/i18n 監査で発見: ラベル編集(frame/rect/ellipse の中央ラベル、
line/arrow のコネクタラベル)の唯一の入口が **ダブルクリック**(`canvas`の`dblclick`
ハンドラ → `openLabelEditor`)であり、キーボード/スクリーンリーダーのみで操作する
ユーザーはこれらのラベルを一切編集できなかった。text/sticky の内容編集
(`openTextEditor`)も同様に、新規作成直後の自動オープン以外はダブルクリック限定。

`docs/feature-backlog.md` FT-19 は「Enter(現在は図形作成に割当)または F2 相当の
キーで開く。キー割当の衝突整理が要る」と指摘していた。実際にキー割当を調べると、
**衝突は無かった**: keydown ハンドラの Enter 分岐は
`if(createShapeKbd())e.preventDefault();` のみで、`createShapeKbd()` は
`state.tool==='select'|'hand'|'eraser'|'pen'` のとき何もせず `false` を返す
(図形描画系ツールのときだけ新規図形を中央に作成する)。つまり **`select` ツールで
何かを選択している通常の操作状態では、Enter は完全に未使用**だった。

## 何を (Decision)

### `state.tool==='select'` のときだけ Enter を「選択中の1つのシェイプを編集」に割り当てる

```js
else if(k==='enter'&&!meta&&!e.shiftKey){
  // select ツールなら既存の選択を編集。それ以外のツールでは従来通り作成
  // (createShapeKbd は select/hand/eraser/pen で no-op のため衝突しない)。
  if(state.tool==='select'&&editSelectedShapeKbd()){e.preventDefault();}
  else if(createShapeKbd())e.preventDefault();
}
```

`editSelectedShapeKbd()` は「選択がちょうど1つ・ロックされていない」ときのみ
`true` を返して処理し、それ以外は既存の `createShapeKbd()` パスに委譲する(select
ツールで選択が0または複数のときは、これまでと同じ「何も起きない」)。

- 対象タイプごとの分岐は**新規に増やさず**、ダブルクリックハンドラが既に持っている
  ロジック(`type` ごとに `openTextEditor` か `openLabelEditor` を呼ぶ)を
  `_openLabelEditorFor(hit)` として抽出・共有する(dblclick / キーボードの両方が
  同じ関数を呼ぶ → 位置計算のズレや将来の型追加漏れが構造的に起きない)。
- text/sticky は `openTextEditor(sh,false)`(内容の再編集)、
  frame/rect/ellipse/line/arrow は `openLabelEditor` へ委譲。pen/image はラベルを
  持たないため無反応(既存のダブルクリック挙動と同一)。

### Tab 巡回との組み合わせで完結する操作列

`Tab`(既存: シェイプ巡回・選択)→ `Enter`(本 ADR: 編集器を開く)→ 入力 →
`Enter`(既存: `commit()`)/`Escape`(既存: 破棄)という、ポインタ無しで完結する
一連の操作になる。これは ADR-0006(long-press)・既存の Tab 巡回導線と同じ
「発見済みの経路を新機能でも塞がない」原則の延長。

## 代替案 (Alternatives)

- **F2 キーを新設**: 却下。Enter で衝突なく実現できるため、覚える必要のあるキーを
  増やさない方が「全部覚えなくていい」という Board の a11y 方針に合う。
- **ツールに関係なく常に Enter=編集を優先**: 却下。描画ツール使用中に古い選択が
  残っている状態で Enter を押すと新規図形作成が起きなくなり、既存の「Enter で
  ツールの図形を配置」という確立済みの動作(ヘルプにも記載済み)を壊す。
  `state.tool==='select'` のガードで両立させる。
- **text/sticky も対象外にして frame/connector ラベルのみ**: 却下。FT-19 のタイトルは
  「コネクタ/フレームラベル」だが、text/sticky の再編集も同じダブルクリック限定
  ギャップであり、`_openLabelEditorFor` 抽出のついでに一貫させた方が
  「なぜ text だけ編集できないのか」という別の非対称を生まない。

## 影響 (Consequences)

- 新規関数 `_openLabelEditorFor(hit)`(dblclick ハンドラから抽出・共有)、
  `editSelectedShapeKbd()`。keydown の Enter 分岐に1行追加。
- 新規 i18n キー `editLabel`(ja/en)。ヘルプグリッドの `Enter` 行を
  `k.create+' / '+t('editLabel')` に更新(2つの意味を両方表記)。
- `state` は変更しない(既存の `openLabelEditor`/`openTextEditor` がそのまま
  `Store._recordCommitted` 経由でコミットする — 編集内容の可逆性は既存のまま)。
- テスト: `editSelectedShapeKbd` が (a) 選択0件/複数件で no-op、(b) ロック中shapeで
  no-op、(c) frame/rect/ellipse/line/arrow で `openLabelEditor` 相当が呼ばれる、
  (d) text/sticky で `openTextEditor` が呼ばれる、(e) pen/image で no-op、
  (f) `state.tool!=='select'` のときは Enter が従来通り `createShapeKbd` に委譲される、
  ことを固定。
