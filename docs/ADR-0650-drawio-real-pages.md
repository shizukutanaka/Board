# ADR-0650: .drawio 複数ページ ↔ Board 真のページ

## 状況
ADR-0646 で真の `state.pages` が実装されたが、drawio 出入力はまだ
ADR-0311 のフラット化を引きずっていた: 複数 `<diagram>` を持つ mxfile を
読むと全ページを _dx オフセットで横並びに潰し、エクスポートは常に
単一 `<diagram>` を吐いた → 往復でページ構造が失われていた。

## 決定

### ワイヤ: `pageAdd` が `op.shapes` を持てる
インポートは「ページ + その中身」を1つの原子 op にしたい (undo が
ページ単位で機能するため)。`pageAdd` の forward で `op.shapes` を
`Net._attachShape(clone)` で取り付け (byId 冪等)、backward で id を落とす。
`validRemotePayload` は `shapes` 配列を pageDel と同じ句で検証、
`_slimOp` は画像スリム対象リストに `pageAdd` を追加。

### 互換: 同伴 addMany をブロードキャストのみで送出
`Net.broadcast({op:'addMany',shapes,clock:...})` を pageAdd コミット直後に
流す (ローカル history には入らないので undo はページ単位のまま)。
- 0650+ ピア: pageAdd でページ+図形、addMany は byId ガードで重複排除
- 0646–0649 ピア: pageAdd (ページのみ) + addMany (`s.pg` 付きで正しい
  ページへ着地)
- pre-0646 ピア: pageAdd を棄却、addMany は無印として従来のフラット着陸

### インポート
`importDrawioText` で `<diagram>` 断片を matchAll 抽出 → 各断片を
`<mxfile>` で包み既存 `drawioToShapes` に通す (非圧縮・`_dioInflate` 再帰
経路の双方で同じ分岐)。非空ページが ≥2 のときだけ多ページ化 — 単一
ページファイルの挙動は変わらない。`pageAdd` の seed 経路により初回は
既存盤面の無印図形が page1 に帰属する正しい移行となる。取込後は最初の
取込ページへ `switchPage` + その図形を選択。ページ名は断片ごとの
`<diagram name>`、docName は従来通り最初のページ名。

### エクスポート
`boardToDrawio` を `_dioCells(shapes)` (セル生成) と `_dioModel(cells)`
(mxGraphModel 組立) に分割。`_pgOn()` 時は各 Board ページから `<diagram>`
を1つずつ生成 (メンバー判定は `(s.pg||pages[0].id)===p.id` の位置規則)。
選択エクスポートも同一経路 — 選択図形が属するページだけが diagram と
して出る。

## 非目標
空 `<diagram>` ページの維持 (非空のみ作成)、drawio 側のページ順序以外の
属性 (viewState 等は引き続き最初のページのみ復元)、Board ページの
drawio 固有メタデータ。
