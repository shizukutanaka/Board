# ADR-0634: プレゼン突入で進行中ジェスチャをキャンセル

- 状態: 実装済
- 日付: 2026-09-28

## 背景

`Presentation.enter()` は `_cxO()` で編集 overlay のみ畳んでいた
(ADR-0582) が、`ptr.down` のポインタジェスチャはそのまま残った。
`setPointerCapture` でキャンバスに捕捉されたドラッグは overlay 出現後も
イベントが届き、リリース時に不可視の move/resize op がコミット
され得た (プレゼン中表示中の見えない盤面変更)。Space/矢印でフレーム
送りしながらドラッグが継続する状態も発生し得た。

## 決定

`enter()` の冒頭で `if(ptr.down)_cancelPointerGesture()` — 部分変更を
復元する既存の統一キャンセル経路に載せる (dragKind 別の restore 済)。

## 影響

- 突入前に `ptr.down` → ジェスチャは元へ復元され、overlay 裏での
  不可視コミットを解消。+~60B。
