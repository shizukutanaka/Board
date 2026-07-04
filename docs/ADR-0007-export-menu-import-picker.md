# ADR-0007 — エクスポートメニュー + .board インポートのファイルピッカー

- Status: Accepted (implemented)
- Date: 2026-07-01
- 関連: `docs/feature-triage-2026-07.md` §4.4、`docs/feature-backlog.md` FT-07、ADR-0006

## なぜ (Context)

ADR-0006(FT-06)で long-press によるコンテキストメニューを実装し、タッチ端末での
到達不能性の大半を解消した。残る `docs/feature-triage-2026-07.md` §4.4 の指摘は:

- **`.board` インポートが drag-drop 限定**: `importBoard(file)` の唯一のトリガーが
  キャンバスへの drag-drop で、`<input type="file">` がドキュメント内に存在しない。
  タッチ端末では ADR-0004(自己上書き保護)のバックアップからの復元さえ不可能。
- **エクスポートボタンが PNG 固定**: `btnExport` は `exportPNG` にのみ配線されており、
  SVG(`exportSVG`, ⌘⇧E)・PDF(`exportPDF`, ⌘P)・`.board`(`exportBoard`, ⌘⇧S)は
  すべてキーボード限定。

## 何を (Decision)

1. **ファイルピッカー**: 非表示の `<input type="file" id="fileImport" accept=".board">`
   を追加。`change` イベントで選択されたファイルを既存の `importBoard(file)`(drag-drop
   ハンドラが呼ぶのと同じ関数)にそのまま渡す。`e.target.value=''` を毎回リセットし、
   同じファイル名を連続選択しても `change` が再発火するようにする。
2. **エクスポートメニュー**: `btnExport` の隣に新規アイコンボタン `btnExportMenu`(下向き
   シェブロン)を追加。クリックで `UI.openExportMenu(x,y)` を呼ぶ。この関数は
   PNG/SVG/PDF/.board の4エクスポート + `.board` インポート(ファイルピッカーを開く)
   の項目を組み立て、**既存の `UI.openCtxMenu(x,y,customItems)`** に委譲する。
3. **`openCtxMenu` の拡張**: 第3引数 `customItems` を追加し、渡された場合はそれを
   そのまま描画する(未指定時は従来通り選択ベースの項目を組み立てる、完全後方互換)。
   これにより、位置決め・キーボードナビゲーション(`_ctxMenuKeyNav`)・フォーカス管理・
   外側クリックでの close といった `#ctx` 要素の描画/操作ロジック一式を**新規コードなしで
   再利用**する(これらはすべて `#ctx` という DOM 要素に対する汎用処理であり、選択ベースの
   項目セットに依存していない)。

`btnExport` 自体のクリック挙動(PNG を即座に書き出す)は変更しない — 既存のマウス/
キーボードユーザーの筋肉記憶を壊さないため。

## 代替案 (Alternatives)

- **`openCtxMenu` を汎用メニュー関数として全面的にリファクタ**: 却下。既存の選択ベース
  ロジックへの変更なしに、後方互換なオプション引数1つで同じ再利用効果が得られるため
  過剰。
- **専用の新しいメニュー DOM/CSS を実装**: 却下。`.ctx-menu`/`.ctx-item` は既にキーボード
  ナビ・フォーカストラップ・位置クランプを備えており、複製はコードの重複を生むだけ。
- **`btnExport` 自体を long-press/右クリックでメニュー化**: 却下。ボタン要素での
  ジェスチャー実装は canvas の pointerdown 一式と異なるコードパスが必要になり複雑さが
  増す。独立したシェブロンボタンの方が発見しやすく実装も単純。

## 影響 (Consequences)

- 新規 DOM: `btnExportMenu`(アイコンボタン)、`fileImport`(非表示 file input)。
- 新規 UI メソッド: `UI.openExportMenu(x,y)`。
- `UI.openCtxMenu` のシグネチャに後方互換な第3引数を追加(既存2箇所の呼び出し元は無変更)。
- 新規 i18n キー(ja/en): `ctxExportPNG`/`ctxExportSVG`/`ctxExportPDF`/`ctxExportBoard`/
  `ctxImportBoard`。
- これで `docs/feature-triage-2026-07.md` §4 のタッチ到達不能性は解消(残る §3 の
  FT-05 は UX 簡素化のみで機能面の欠落ではない)。
- テスト: `openExportMenu` が正しい項目(ラベルキー・ショートカット・対応関数)で
  `openCtxMenu` に委譲することを、`UI.openCtxMenu` のモンキーパッチで検証。実際の
  `#ctx` DOM 描画(`appendChild` 等)はテストハーネスの汎用フェイク DOM が子要素を
  追跡しないため対象外(`openCtxMenu` 自体も従来からテスト対象外)。
