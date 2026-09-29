# ADR-0468 — architecture.md の wire ライフサイクル節を追加

## 状態

実装済 (v1.7.501)

## 背景

`docs/architecture.md` の P2P 同期節は ADR-0432/0438 時点で停止していたが、その後の 30+ ADR (0443–0467) で wire 層にライフサイクル規則が体系化された: incarnation id、応答選出、throttle 再送、bye 配送、ルーム切替 hygiene、undo×sync、frag 再起動、切断掃除。

## 決定

「ライフサイクル」副節を追加し上記を一文ずつ ADR 参照付きで列挙。将来の Net 状態追加者が「どの状態が room-scoped で、init が何をリセットすべきか」の一覧をここで引けるよう、リセット対象のフィールド名を網羅記載した。

## 影響

- ドキュメントのみ。コード変更なし。
