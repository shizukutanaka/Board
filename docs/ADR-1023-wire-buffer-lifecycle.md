# ADR-1023 — wire-buffer lifecycle: room-scoped reset vs doc-scoped survival

## 監査

`Net.init` (re-init / room switch) と wholesale doc swap が交差する全ての
Net レベル可変バッファを走査し、「ルームスコープのものは reset、
ドキュメント/コンテンツスコープのものは survive」が成立するか監査。
**実害なし — clean 完走**。

| バッファ | スコープ | ライフサイクル | 根拠 |
|---|---|---|---|
| `seenOps` | room | `Net.init` で `_sO().clear()` (ADR-0459) | `(peer,seq)` dedup はルーム毎の到達証跡; peerId の per-boot suffix で cross-boot 衝突も不存在 |
| `_imgSent`/`_imgChunks`/`_imgOuts` | room | init でクリア (ADR-0464) | blob 会計はルームのピアに対する送信帳簿 |
| `_imgqT` | room | init でクリア (ADR-0836) | 古い throttle が新ルームの正当回答を抑止しない |
| `_snapIn`/`_opcIn` | room | init でクリア (ADR-0466) | 再組立スロットの継ぎ接ぎ防止 |
| `_imgPending` | content | **survive** — 60s TTL + blob 到着 + `_psc`/`_pcC`/`_pcR` | キーは content-addressed blob hash; 生存 shape の ref は swap 後も heal が必要 (ADR-0835/0985) |
| `_dcQ`/`_dcQB` | link | `dc.onclose` でクリア (ADR-0446), bufferedAmountLow で drain | 送信キューは接続寿命に従う |
| `_presenceTimer` | link | init で clearInterval | 旧 heartbeat のリーク防止 |
| `_pr()` peers | room | 非 `rtc:` 行を init で掃除 (ADR-0458), `_pCt` 再ベースライン (ADR-0467); `rtc:` 行は link close/bye で死滅 (0839/0986) | 手動 1:1 invite link は BC ルームを跨ぐ設計 |
| `_lastSelSent` | peer | **survive** — 新ピア到着の `_touchPeer` が null reset で再送強制 (0011) | 存続 rtc peer は既に最新選択を保持; 新 BC ピアは touchPeer で網羅 |
| `_snapT`/`_lastSnapAt`/`_snapRx`/`_snapRetry` | room | init でクリア (ADR-0452/0475) | 有界再送タイマと応答フラグ |
| `state._lastRep`/`_nameTs`/`_namePeer` | room | 実ルーム切替で reset (ADR-0619), ただし doc record に永続化 (0695) | 因果マーカーは wire-domain |
| `state.seq` | boot | **survive** — `peerId` の per-boot incarnation で `(peer,seq)` が一意 (ADR-0459) | リセット不要・doc 永続化も不要 |
| `state._lastTs` | boot | **survive** — HLC floor はグローバル単調 | 時計を巻き戻さない |
| `state.wclock` | doc | `_rs`/doc load が `_wM()` で総取替; doc record `wc` に永続化 (0460) | LWW 帳簿は盤面と同寿命 |
| `state.roomId` | — | init で設定; 切替で dc/rtc close (0839) | |

## 契約

- **新たな Net レベル可変バッファはライフサイクルを宣言する**:
  room-scoped → `Net.init` で reset; link-scoped → 接続 close で reset;
  doc-scoped → doc swap (`_rs`) に追従; content-addressed → 到着/TTL で heal。
  いずれにも属さない生存はリークとみなす。
- dedup/会計/再組立は必ず room-scoped。`_imgIn`/`_imgPending` のような
  content-addressed store は「キー自身が真実」を持つため cross-room 安全。

テスト: 全バッファに junk を仕込み `Net.init('roomZ')` → reset/survive
分割を実経路で検証 (test.mjs)。
