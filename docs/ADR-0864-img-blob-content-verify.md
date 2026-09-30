# ADR-0864 — 受信画像 blob の content-address 検証

## Status
Accepted — v1.7.890

## Context

`_imgSlim` は画像 dataUrl を `_imgHash` (FNV-1a 32bit + 長さ) の
content-address キーで束ね、`{k:'img'}` チャンクでバイト列を送る。
受信側の `_imgIn` ストアは**送信者が申告したキーのまま格納**しており、
キーとバイト列の一致を一切検証していなかった:

```js
this._imgIn.set(msg.key, data);   // key は peer が自由に選ぶ文字列
```

## Defect

被害者の画像キー `k_v` (= shared な形状の `img:` ref から既知) を名乗る
`{key:k_v, data:<攻撃者バイト>}` を送るだけで、受信者の `_imgIn[k_v]` が
上書きされる (FNV 衝突すら不要 — 検証がないため任意キーが通る)。影響:

- `_imgPending` に park 中の形状が `k_v` で解決 → **被害者の画像に
  攻撃者のバイト列が attach** される
- `imgq` 再配信が `_imgIn.get(k_v)` を `_imgSent` より先に参照 →
  被害者自身のキーへの問い合わせにフォージを返す (自己増殖型)
- `s.dataUrl` の書き込みは LWW clock を伴わない副作用チャネル経由のため
  差分が永続化し、後続スナップショットまで伝播 → **ピア間の恒久発散**

## Decision

再組立て完了時に `hash(blob)` とキーを照合する:

```js
if(_imgHash(data)!==msg.key.replace(/:\d+$/,''))break;
```

- ベースキー `k` → `hash(data)===k` を要求
- チェーン slot `k:N` → `hash(data)===k` を要求 (チェーン slot は
  **同じベースハッシュを持つ別 dataUrl** を保持する設計なので同じ検証が効く。
  `_imgNextKey` は `:N` を suffix するだけでベースは変わらない)

## Consequences

- 送信者はバイト列とキーの hash 一致性が必須 — 偽キー注入は破棄
- FNV-1a は暗号的でないため、決意した攻撃者は同長衝突を ~2^32 の
  preimage 計算で作成可能。脅威モデル (半信頼の共同編集者に対する
  一貫性保護) としては十分。暗号耐性が必要になれば SHA 系への
  切替えは本検証点を維持したまま `_imgHash` を差し替えるだけでよい。
- 正当経路 (`_imgSlim` 産出のベース/チェーンキー) は全て hash 整合のため
  無影響。

## Tests

`Net._onRecv` 境界での behavioural ピン:
- 不一致 blob は `_imgIn` 不格納・parked ref 非 attach
- `k:N` suffix で検証回避不可
- 正直な blob は正常解決
- 既存 img テスト (`ADR-0629/0745/0746/0747/0449/0454/0563/0781/0784/0785`)
  を `_imgHash(data)` 整合キーへ移行
