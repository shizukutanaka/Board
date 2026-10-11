# ADR-1193: wire-auth verify-order & key-material lifecycle — mint 長の全境界超過を閉塞

- Status: implemented (fix, v1.8.217)
- Round: 943 (Elon/Socrates audit loop)

## 監査軸

ADR-1056 は wire 認証 (HMAC-SHA-256 タグ) の中核契約をピン済み — unsigned/forged 棄却、transport 分離 (mac=doc 秘鍵/BC、dmac=リンク鍵/DC)、`data` 除外タグ、外部リンク鍵の分岐。本ラウンドは残面の検証順序と鍵マテリアルのライフサイクルを監査する。

## 発見 — 実害1件 (鍵 mint が全ダウンストリーム境界を超過)

### `_sec()` mint = `uid()×4` = 128 文字、`≤64` ゲート全敗

```js
// Before
if(!state.roomSecret){state.roomSecret=uid()+uid()+uid()+uid();…}   // 128 chars
```

`uid()` = `crypto.randomUUID().replace(/-/g,'')` = 32 hex → 4連結で **128 文字**。一方、鍵が再採用される全ゲートは `≤64`:

| ゲート | 場所 | 128文字 mint の行き先 |
|---|---|---|
| `board.rs` 読み取り | `_sec()` 905 | `_ln(v)<=64` で自身の保存値を棄却 → 同一オリジンの別タブは別鍵を mint → **BC `_mac` 恒常失敗、クロスタブ同期は沈黙 dead** |
| `d.rs` 復元 | `Persist.load` 9048 / `restoreBackup` 9116 | 永続化した 128文字 `rs` を棄却 → リロード毎に新鍵 mint → 既存ピアの学習鍵は死ぬ |
| トークン `k` | `_decodeToken` 8756 | offer が運ぶ `k=_dcKey=_sec()`=128 → joiner は `k:null` → `_dcKey` null → `_dmac` が自己 mint にフォールバック → **双方向 dmac 恒常失敗、RTC リンクは接続成立しても全メッセージ沈黙 dead** |

つまり mint 鍵は **write-only の死重**: `board.rs` へ書くが二度と読めず、doc `rs` に載るが二度と復元されず、トークンに乗るが joiner では採用不能。同一オリジン 2 タブ間の BC 収束 (ADR-1056 設計意図「ls wins → タブ間で1鍵へ収束」) も機能していなかった。

### 修正

```js
state.roomSecret=uid()+uid();   // 64 hex = 256bit、全 ≤64 境界を通過
```

1行の長さ修正で3つの沈黙 dead が同時に解消する: BC タブ間収束、リロード後の rs 復元、RTC リンク鍵採用。

## 検証結果 (残面 — 全て clean、契約を固定)

### 1. verify-order は「副作用ゼロの順」で組まれている

```js
if(!msg||!_iO(msg)||msg.peer===_pi())return;                  // self-echo — tag 不要
if(msg.peer!==_ud&&(…peer bounds…))return;                   // ADR-0827: BC 'rtc:' 排除
if(!_iS(ex)||!_eqs(ex,viaRtc?this._dmac(msg):this._mac(msg)))return;   // MAC
switch(msg.k){…}
```

MAC 検証より前に走るのは read-only の拒否判定のみ — `_touchPeer`/park/apply 等の副作用は全て検証後。

### 2. viaRtc は検証「後」に BC-kind を棄却する

```js
if(viaRtc&&(msg.k==='hello'||msg.k==='ping'||msg.k==='sync-req'))return;   // ADR-0986
```

順序が逆だと未認証メッセージを kind で分流してしまう — 現行は「まず本物か、その後に届け先か」。

### 3. 鍵マテリアルの遷移は閉域

| 遷移 | `_dcKey` |
|---|---|
| `_wrtcInit` | `null` (旧リンク鍵を消去) |
| `wrtcCreateOffer` | `_sec()` — offer トークンが doc 秘鍵を運ぶ |
| `wrtcAcceptOffer` | token `k` を採用 (offerer の秘鍵) |
| `wrtcConsumeAnswer` | 同じ `k` を再採用 — 冪等 (`_encodeToken` が `this._dcKey` を emit し joiner は採用値をエコー) |
| `dc.onclose` | `null` — 以後 `_dmac` は `_sec()` フォールバックで `_mac` と等価 |

`_dcKey=null` のとき `_dmac(m)===_mac(m)` — リンク鍵なしでは部屋秘鍵が両面を認証するフォールバック (BC 専有運用と整合)。

### 4. プリミティブ

- `_hmac`: RFC 2104 準拠 (key>64B → hash、ipad 0x36/opad 0x5c、内部 SHA-256 `_shaB`)。`_ln(kd)` はバイト長。
- `_eqs`: 長さ早期 return + XOR ループ — hex-64 固定幅タグの定数時間比較。
- `_canon`: `{mac,dmac,data}` のみ除外 — `peer`/`k`/`clock` 等の残フィールドは全て署名対象 (`peer` は envelope として認証済み、op.clock.peer と ADR-0931 で結合)。`data` 除外の代替完全性: img チャンクは content-hash 検証 (`_imgHash(data)===key.replace(/:\d+$/,'')`)、frag チャンクは join 後の内側 payload が `_onRecv` を再通過 (ADR-0987)。

## ピン (test.mjs)

- RFC 4231 TC2 (short key) + 80B ASCII 鍵 (>64B → hash-first 分岐) の既知ベクトル。
- **mint 64-hex + board.rs 往復採用** — 修正の行動ピン: 新規 mint が `≤64` ゲートを通り、別タブ相当 (`roomSecret=null` リセット) が同じ鍵を採用する。
- `_eqs` 等価/異長/同長異値。
- `_dcKey` 遷移 (設定→dmac 分岐、`null`→`_mac` 等価フォールバック)。
- `_canon` の mac/dmac/data 限定除外。
- verify-order: `peer===_pi()` は MAC なしでも棄却、forged 'hello' で `_touchPeer` 不発火、valid dmac 'hello' on viaRtc は ADR-0986 棄却。
- egress 全型タグ付与のソースピン (`_send`→mac、`_bcast`→dmac)。
