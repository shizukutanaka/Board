# ADR-0479: zorder legacy `after` の frac/id 長さキャップ

## 状態

実装済 (v1.7.512)

## 背景

ADR-0473 は `changes` ブランチ (Step2 minimal-delta) の `c.before`/`c.after`/`c.frac` を
≤600 に整合させたが、**legacy `after` ブランチ** (旧フォーマット `{after:[{id,z,frac}]}`)
には残穴があった: `c.frac` は string 型のみ検査 (長さ無制限)、`c.id` も長さ無制限。
敵性ピアが 1MB 級の frac/id 文字列を持つ zorder op を注入可能だった (payload bloat +
格納肥大)。

## 決定

legacy `after.every(c=>...)` に `_ln(c.id)<=64` と `_ln(c.frac)<=600` を追加し
`changes`/`add`/`validShape` の既存キャップと整合。

## 影響

- validRemotePayload の wire キャップ整合を完結 (ADR-0473 の残穴解消)
- 既存フォーマットの後方互換は維持 (キャップのみ追加)
