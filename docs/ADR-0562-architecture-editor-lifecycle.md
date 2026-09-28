# ADR-0562: architecture.md 編集 overlay ライフサイクル節の同期

## 状態
実装済 (v1.7.590)

## 背景
ADR-0556..0561 で remote-del mid-edit / 二重オープン / resize の一連の editor
overlay ライフサイクル不具合を修正したが、architecture.md の Input 節には
`openTextEditor` の ADR-0533 言及のみで、このクラスタの知見が散逸していた。

## 決定
Input 節に「編集 overlay のライフサイクル」段落を追加 — commit 側の `byId`
ガード (0556-0558)、follow 側の proactive close (0559)、`_cxO` による
順序化 (0560)、resize sig リセット (0561) の4責務をまとめて記録。

## 影響
将来の editor 経路変更者が「commit ガード」と「follow クローズ」を別責務として
把握できる。コード変更なし (docs のみ)。
