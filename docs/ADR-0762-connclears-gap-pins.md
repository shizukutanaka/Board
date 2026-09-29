# ADR-0762: connClears ギャップ/生存期間結合の behavioural ピン

## 状態

採択 — v1.7.788 実装済 (tests)。

## 背景

ADR-0758/0759 の修正 (del redo の `_remoteDelConnFix`、add/addMany undo の合成 del op) はソースピンのみで behavioural 検証がなかった。

## 決定

2 件の behavioural ピンを追加:

- **v1.7.78a**: del→undo→(ギャップ結合)→redo で、undo 後に復元した図形へ結合したコネクタが redo の del forward でクリアされる
- **v1.7.78b**: add undo で、add 生存期間に結合したコネクタが逆 del としてクリアされる

## 結果

- `test.mjs` 2 behavioural ピン追加 (2758 pass / 0 fail)
- コード変化なし (version 1.7.788 のみ)
