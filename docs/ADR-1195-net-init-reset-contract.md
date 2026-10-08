# ADR-1195: Net.init の cleared/retained 契約 — room-bound 対 doc-bound の state 分離

Status: Accepted (round945)

## Context

`Net.init(roomId)` は BroadcastChannel 部屋への (再) 接続点であり、room 切替でも boot 時でも同じ経路を通る。この関数が保持する可変 state は2種類に分かれる:

- **room-bound** — その部屋の「今の相手」にのみ意味を持つ状態 (送受キュー、再組立スロット、dedup、presence 送信位相、RTC 鍵)。部屋を変えたら必ず捨てる。
- **doc-bound** — ローカル doc の内容が依存する状態 (受信 blob キャッシュと heal 待ち行列)。doc は room を跨いでも同じなので残す。

この分離は ~15 の ADR (ADR-0385/0446/0458/0464/0466/0619/0695/0839/0981/0982/0986/1030/1056/1059/1061/1182) が個別に積み上げてきたもので、一箇所で規約化されていなかった。

## Decision — 契約

### cleared (room-bound, 常時リセット)

| state | 理由 |
|---|---|
| `this.bc` (close+bye) | 旧部屋への announce + close (ADR-0458) |
| `state.seenOps` (`_sO()`) | dedup 名前空間は部屋ごと。op は冪等のため再適用は安全 |
| `_snapT`/`_lastSnapAt`/`_snapRx`/`_snapRetry`/`_snapRqs` | join-sync の位相は部屋ごと (ADR-0475/1190) |
| `_imgSent`/`_imgChunks`/`_imgOuts`/`_fragOuts` | 「この部屋のピアが既に持っている blob/フラグメント」の記録は部屋ごと (ADR-0464) |
| `_snapIn`/`_opcIn` | 受信再組立スロット — 旧部屋の継ぎ接ぎを新部屋へ持ち込まない (ADR-0466) |
| `_imgqT`/`_imgScanN` | imgq throttle + rescan 位相は部屋ごと |
| `_dcKey`/`_dcQ`/`_dcQB` | RTC 鍵と送信 backpressure キューは現在のリンクに紐付く (ADR-1056/1059) |
| `_lastSelSent`/`_lastSelAt`/`_lastCursorSend`/`_lastCurKey` | presence 送信 dedup/位相 — 新部屋では初回全送信させる (ADR-1178/1179) |
| `_presenceTimer` | 心拍 interval は arm し直し (ADR-0981) |
| `state.peers` の非 `rtc:` 行 + `_pCt` 再ベースライン | BC presence は部屋ごと (ADR-0458/0467) |
| `state._lastRep`/`_nameTs`/`_namePeer` + `dc`/`rtc` close | **真の room 切替のみ**: 因果 marker と 1:1 RTC リンク (ADR-0619/0695/0839) |

### retained (doc-bound, 維持)

| state | 理由 |
|---|---|
| `_imgIn` + `_imgInB` | 受信 blob キャッシュ — doc の `img:key` 参照が解決を続けるために必要。消すと live 図形が空転し再フェッチ要求になる |
| `_imgPending` | 未解決参照の heal 待ち行列 — 同じ doc の未解決参照は新部屋でも聞き続けるのが正しい (TTL 60s/≤256 で自己清掃) |
| `state.peers` の `rtc:` 行 | WebRTC は手動 1:1 招待ペア — BC 部屋切替を故意に生き延びる (ADR-0820)。`dc.onclose` または `_pk` fold が死行を清掃 |
| `_rtcPeerId` | 現在のリンクの synthetic peer id — リンクが生きる限り維持;真の切断は `dc.onclose`/`_pk` が清算 |

## 検証結果

- `_imgSent` は cleared・`_imgIn` は retained — 「答えた」集合は部屋ごと、「持っている」集合は doc ごと、という非対称は意図的。
- `seenOps` クリアによる再適用は op 冪等性 (byId 既存 skip / tomb gate / LWW) で安全。
- `rtc:` 行の TTL reap 免除 (ADR-1182) との整合: 行は `dc.onclose` か `_pk` でのみ消えるため、clear する必要がない。

## Pins

`test.mjs` の ADR-1195 ブロックが `Net.init('roomZ')` 前後で cleared/retained の各代表フィールドを挙動検証 (7 asserts)。
