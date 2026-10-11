# ADR-1145: bound-connector × page parity — off-page targets resolve unbound

## Context

ADR-1144 は「hidden 結合先は unbound 解決」に閉塞した。同じ問いを**ページ軸**へ拡張する: `_pgOk` (ADR-0646) は「図形は自ページでのみ描画・ヒット・列挙される」規約だが、bound connector の端点解決は `pg` を検査していなかった。

- `connEnds` は `s.a`/`s.b` の結合先を `byId` で引き、ライブ bbox エッジへ投影する — 結合先が `s.pg ≠ conn.pg` (別ページ) の場合でも。
- `_bt` (検索文字列化、ADR-0381) も pg 未検査 — 別ページ図形の label/text/type がコネクタ検索へ漏れていた。
- `describeShape` (ADR-0380) の SR アナウンス `bound: A→B` も同様に結合先の型名を読み上げていた — hidden/off-page 結合先の型を暴露するリーク。

到達性: UI 上のバインド操作 (`_bindAt`) はカレントページの図形しか hit しないためローカルでは不可達だが、wire op / snapshot import / '?' stub heal / ページ削除 unpage の組合せで cross-page バインドは形成可能。形成されると矢印が「見えない図形」の正確な輪郭位置へ追従し、そのページでのリモート編集ごとに端点が漂流する — ADR-1144 と同じリーククラス。

## Decision

新ヘルパ `_pgEq(a,b)` — 実効ページ一致 (未設定は先頭ページとみなす `_pgOk` と同一の規約):

```
_pgEq=(a,b)=>!_pgOn()||(a.pg||_pgs()[0].id)===(b.pg||_pgs()[0].id)
```

3面へ適用:

- `connEnds` の `_bnd`: `t&&!_hd(t)&&_pgEq(t,s)` — 別ページ結合先は unbound 解決 (stored 端点に凍結)。
- `_bt`: 同条件で — 別ページ結合先名は検索にヒットしない。
- `describeShape` の `_ep`: 同条件で — hidden/off-page 結合先は型名ではなく `?` とアナウンス。

ADR-1144 と同じく**バインド自体は消さない**: `s.a`/`s.b`/`s.aF`/`s.bF` は保持され、結合先がコネクタのページへ戻れば即座にライブ追従へ復帰する。

## Consequences

- `connEnds` が単一漏斗のため、描画・ヒット・bbox・`_linePts`・connClears・hop marks・エクスポート・ミニマップがすべて「off-page = unbound」に整合。
- off-page 期間中の端点は stored 座標に凍結 — 別ページ図形の現在位置・追従リークが閉塞。
- hidden parity (ADR-1144) と独立に合成: 両条件が同時に満たされないと anchoring しない。
- 7 behavioural pins。

## Deferred

- 別ページ結合先を持つコネクタを警告する UI (「この矢印は別ページの図形を指している」) は YAGNI — 形成経路が限定的かつリークは閉塞済みのため。
- `_bindAt` で cross-page hit を許す設計は検討対象外 (ヒット面は常にカレントページのみ)。
