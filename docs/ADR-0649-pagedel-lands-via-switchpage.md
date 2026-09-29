# ADR-0649: pageDel の着地点を switchPage 経由に

## 状況
`_pgDel2` (ADR-0646) は削除されたページのメンバーを落とし、閲覧中ページ
(`state.curPg`) が消えた時は素の代入 `state.curPg=firstId` で生存ページへ
着陸していた — `curPg` の宙吊り自体は既に防がれていた。

ただし代入は `switchPage` をバイパスするため、通常のページ切替で起きる
副作用が全て抜けていた:

- `_ann(page.name)` — SR ユーザーに移動先ページ名が読み上げられない
- `Net.sendCursorHide()` — ピアに古いページ座標のカーソルが残る
  (ADR-0647 で pg 同梱にはなったが、切替時の hide 通知自体が無い)
- `_cxO()` — 編集 overlay が閉じられず残る
- `_zR()` — 手動切替と違いビューポートがリセットされない (削除された
  ページのズーム位置のまま)

## 決定
`_pgDel2` 内の `state.curPg=firstId` を `switchPage(firstId)` に変更。
通常切替と同じ副作用一式 (announce・cursor hide・overlay 畳み・fit) が
ローカル削除でもリモート `pageDel` 適用でも発火する。

`switchPage` は `_pgById(id)` が無ければ no-op — `firstId` は splice 後に
必ず存在するので到達は保証される。リモート経路では presence の
`sendCursorHide` が送出されるが、それはメッセージであり op ではなく、
セマンティクスとしても正しい (自分の居場所が変わった通知)。

## 検証
test.mjs にリモート経路の回帰ピン: 閲覧中ページを `applyRemote pageDel`
で削除 → `curPg` が生存ページへ着陸することを固定。
