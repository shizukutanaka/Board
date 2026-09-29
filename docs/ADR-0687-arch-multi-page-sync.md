# ADR-0687: architecture.md マルチページ節を 0671–0686 へ同期

## Status
Accepted — round437 (docs のみ)

## Context
マルチページ節は ADR-0646–0670 まで — 以後のフォローアップ監査 (snapshot 取込のビュー保持 0672・タブ UI 0673-0686・curPg 永続化 0674・presence dedup 0680・pageName LWW 0681・adopt エディタ畳込 0684 等) が未反映で、直近 16 ADR が文書から読み取れなかった。

## Decision
節を 4 項目追加して同期: 遷移 (0684 追記)・プレゼンス (0680 追記)・ヒール (0679 追記)・新規「スナップショット」「タブ UI」「派生面」ブロック + 完了済み行を 0686 まで更新。

## Tests
docs のみ (assert 増減なし)
