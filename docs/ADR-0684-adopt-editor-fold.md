# ADR-0684: _pgAdopt のページ交代でエディタも畳む

## Status
Accepted — round434

## Context
ADR-0664 は `_pgAdopt` (スナップショット/import/restore のページ集合一括入替) で閲覧ページが変わる時にポインタジェスチャのみキャンセル — **テキスト/ラベルエディタは畳まれていなかった**。閲覧ページが集合から消えると、見えない別ページの図形を overlay で編集し続ける状態になった (コミットはその図形へ効く)。

## Decision
ページ交代時に `_cxO()` (両エディタの blur) — `switchPage` と同格のライフサイクル。

## Tests
2 asserts: cur 不在時の先頭ページフォールバック + `_cxO` ゲートのソースピン
