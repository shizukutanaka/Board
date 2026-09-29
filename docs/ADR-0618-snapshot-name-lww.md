# ADR-0618: スナップショットの docName を nameTs で LWW 化

## 状態
実装済 (v1.7.645)

## 背景
docName の改名は 'name' メッセージで `_nameTs` 比較の LWW (ADR-0581) に
なっているが、スナップショット採用経路 (`_applySnapshot`、空盤面時) は
`msg.name` を無条件に `_setDocName` していた。ローカルで改名済みのピアが
空盤面のまま古い世代のスナップショットを受け取ると、改名が古い名前で
上書きされる残穴があった。

## 決定
`_snapshotMsg()` に `nameTs:_nameTs` を同梱。採用側の name 適用を
'name' メッセージと同じ規則に揃える:

```js
if(_iS(msg.name)&&(_iN(msg.nameTs)?msg.nameTs>_nameTs:!0)){
  if(_iN(msg.nameTs))_nameTs=msg.nameTs;
  _setDocName(_s0(msg.name,80));
}
```

- `nameTs` なし (旧バージョン送信側) → 従来通り採用
- 採用時に `_nameTs` を送信側時計へ進め、後続の古い 'name' も正しく棄却
- マージ経路 (非空盤面) は従来通り name に触れない

## 影響
- 改名の LWW が全収束経路 ('name' / snapshot-adopt / op) で一貫
- ADR-0617 と同じ因果マーカーの発想 — ドキュメント単位の状態は全て
  世代情報を持って wire に乗る
