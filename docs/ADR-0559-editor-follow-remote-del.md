# ADR-0559: 編集 overlay の削除時 proactive close

## 状態
実装済 (v1.7.587)

## 背景
ADR-0556/0557/0558 は commit 経路の orphan 書込みを封じたが、リモート del /
clear / replace / ローカル undo で編集中の図形が消えても overlay (textarea / label
input) は **blur まで開き続け**、打ち込んだ文字は全て捨てられていた。`state.editing`
が dead id を指し続ける状態。

## 決定
`_teFollow` / `_lblFollow` (open overlay を viewport に追従させる毎フレーム駆動) に
`byId` ガードを追加 — 対象が消えたら `_rm` して即畳む。frame-loop 経由に載せることで
del/clear/replace/snapshot/undo の **全削除経路** を1箇所でカバー。

## 影響
- `_rm(ta)` で blur が発火しても 0556/0557 のガードが冪等に処理するため二重畳み安全
- 通常編集の挙動は不変。削除された図形に向かって打ち続ける無駄が消える
