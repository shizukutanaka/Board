# ADR-0004 — 自己上書き保護 (self-overwrite protection)

- Status: Accepted (implemented)
- Date: 2026-07-01
- 関連: `docs/research-improvements.md` §3.9「アーキテクチャは既に投票を終えている」、
  §3.7「持てないデータは、所有と言えるか」、Persist (IndexedDB 自動保存)、`replace`/`clear` op

## なぜ (Context)

§3.9 の結論: Board の基盤設計(単一 `DOC_KEY` スロット、複数ボード概念なし、undo history は
セッション限定・リロードで消滅)は「速い・私的・使い捨ての単独スケッチ」を選び取っている。これは
機能不足ではなく**正体**であり、直ちに multipage/複数ドキュメントへ拡張する必要はない。

しかし正体には無自覚な牙がある: `doClearAll`(確認ダイアログ付き)・`importBoard`・
`importFromHash` はいずれも `state.shapes` を丸ごと置換する。置換直後の自動保存(500ms
デバウンス)が **唯一の IndexedDB スロットを上書き**し、セッション内 undo (Ctrl+Z) は有効でも、
**リロード後・タブを閉じた後は復元不能**になる。「0秒で使い始める」の裏に
「0秒で前の思考を消す」が同居している。

§3.9 が示した最小実装(要 green-light、当時は未着手): 破壊的置換の**直前**の状態を副キーへ
退避し、リロード後も単一スロットのバックアップとして復元できるようにする。

## 何を (Decision)

1. **バックアップ書き込み**: `Persist.saveBackup(shapes,viewport,docName)` を追加。同一
   IndexedDB オブジェクトストア (`DB_STORE`) 内の副キー `DOC_KEY+':prev'`(= `'main:prev'`)へ
   `{v,shapes,viewport,docName,savedAt}` を書き込む。スキーマ変更・`DB_VER` bump 不要(既存ストア
   の別キーを使うだけ)。ベストエフォート — 失敗しても破壊的操作そのものは絶対にブロックしない。
2. **トリガ**: `doClearAll()` / `importBoard()` / `importFromHash()` は、`state.shapes` を
   置換する**直前**に、置換前の内容が空でなければ `Persist.saveBackup(...)` を呼ぶ
   (fire-and-forget、置換処理を待たせない)。
3. **起動時チェック**: `main()` の `Persist.load()` 直後に `Persist.checkBackup()` でバックアップ
   の有無を確認。存在すれば `confirm(t('backupAvailable'))` で一度だけ尋ね、
   - Yes → `Persist.restoreBackup()`: バックアップを検証(`validShape`)して`replace` op として
     適用(セッション内 undo 可能、既存の import 系と同じ可逆パターン)、成功トーストを表示。
   - No → `Persist.discardBackup()`: 何もせずバックアップキーだけ削除。
   いずれの場合もバックアップは**消費**される(単一スロット・一度だけ通知)。次に破壊的操作が
   起きるまで再び尋ねない。
4. **UI 新規追加なし**: 既存の `confirm()` パターン(`confirmClear`/`importConfirm` と同じ)を
   再利用。トースト・メニュー・ボタンを新設しない — 単一HTML・最小 UI 原則を維持。

## 代替案 (Alternatives)

- **複数ボード / ページ機能への拡張**: §3.9 が指摘する通り、現行アーキテクチャ全体
  (単一 DOC_KEY・無 identity・セッション限定 undo)と衝突する大規模判断。「正体を選ぶ」の
  (b) workspace 側の対価を払う決定であり、ADR ではなく CLAUDE.md の製品判断として別途扱う。却下(今回)。
- **バックアップを複数世代保持**: 実装・UI が複雑化する割に「使い捨てスケッチ」という正体には
  過剰。単一スロット(直前の1件のみ)で§3.9 の要求を満たす。却下。
- **永続的な「復元」ボタンをツールバーに常設**: 新規 UI chrome が増え、通常時は何もしない
  ボタンが常在することになる。起動時の一度きりの `confirm()` で十分かつ非侵襲的。却下。
- **undo history 自体を IndexedDB に永続化**: §3.11 が既に扱った別課題(undo の約束の期限)。
  スコープが大きく、本 ADR の「直前の全消し/置換からの復帰」という狭い目的には過大。却下(今回)。

## 影響 (Consequences)

- データモデル不変。新しい op 型は追加しない(`replace` を再利用)。
- IndexedDB は既存ストアの別キーを使うのみ、`DB_VER` 変更なし(マイグレーション不要)。
- バックアップの書き込み・読み込みはベストエフォート(失敗時は無視、`try/catch` で握り潰す)。
  操作の成否がユーザー操作をブロックすることは絶対にない。
- テスト: `Persist.saveBackup`/`checkBackup`/`restoreBackup`/`discardBackup` の呼び出しタイミング
  (`doClearAll`/`importBoard`/`importFromHash` から破壊前に呼ばれること)と、`restoreBackup` が
  `replace` op として commit されること(undo 可能)を非空虚テストで固定。fake IndexedDB harness の
  制約上、実際の永続化ラウンドトリップではなく「正しいタイミングで正しい引数を渡して呼ばれるか」を
  検証する(既存の `Persist.flushIfHidden` テストと同じパターン)。
