# ADR-0529: SW は ok 応答のみキャッシュ

## 状態

実装済み

## 背景

サービスワーカーの両 `c.put` 経路が `Response.ok` を見ていなかった:
navigate の network-first 経路と GET の cache-first 経路の双方で、
一時的な 404/500/opaque エラー応答が永続キャッシュに書き込まれ、
次回オフライン時や再訪時にエラーページがキャッシュから返り続け得た。

## 決定

両 `c.put` を `n.ok` でゲート: `if(n.ok)c.put(e.request,n.clone())` と
`e.request.method==='GET'&&n.ok`。非 ok 応答は透過するのみ (キャッシュしない)。

## 影響

- 障害応答の永続キャッシュ混入を防止
- +~20B、test.mjs 全緑
