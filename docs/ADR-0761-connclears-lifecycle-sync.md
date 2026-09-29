# ADR-0761: connClears ライフサイクル規則の architecture.md 同期

## 状態

採択 — v1.7.787 実装済 (docs のみ)。

## 背景

ADR-0755–0760 での connector-binding 監査が完走した。確定した規則:

- **記録 + 再導出の併用**: del forward は wire 記録の `connClears` を適用した後、`_remoteDelConnFix(op)` で現行バインドを再走査する — undo↔redo ギャップや add-undo 生存期間に発生した新規結合もピアと同一結果で消去 (0758/0759)
- **locked 生存者は binding 対象外**: del が locked で削除を skip する図形への結合は消さない — 判定は「id が op に含まれるか」ではなく「実際に死ぬか」で端点毎に行う (0760)
- **undo-wire は再結合を運ぶ**: del/pageDel の undo は `connClears.before` を `upd` op としてピアへ broadcast し、locked ゲートで対称適用 (0707/0711)

architecture.md の connClears 節はこれらが書かれる前の記述のままだった。

## 決定

コネクタ束縛×変換節の `connClears` 項目に2つのサブ規則を追記: 再導出併用 (0758/0759) と locked 生存者判定 (0760)。既存の locked コネクタ非清書規則と undo-wire 再結合規則への参照を整理。

## 結果

- `docs/architecture.md` connClears 節 2 サブ規則追加
- コード変化なし (version 1.7.787 のみ)
