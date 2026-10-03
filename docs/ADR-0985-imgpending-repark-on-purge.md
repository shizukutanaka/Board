# ADR-0985: 全置換パージ `_pcC` が生き残り parked img 参照の imgq 再送ループを殺す

## Status

Accepted (v1.8.011) — implemented.

## Context

`_imgPending` (id→{key,t0} の Map) は blob 未着の `img:` 参照を持つ図形の待機表。
2 つの役割を持つ:

1. **解決の fast index** — blob 到着時 (`k:'img'` msg) に `e.k===msg.key` で解決。
   ADR-0629 の straggler `_sh()` 走査がフォールバック (pending 無しでも解決)。
2. **imgq 再送ループ** — presence 周期で `t0` が 2×INTERVAL 超の項目へ
   `_bcast(_mk('imgq',{key}))` を再送。応答 (blob chunks) が途中で失われた場合の
   唯一の回復経路。60s 超の項目は期限切れで除去。

ADR-0753 は `_pcC()` (全置換パージ: `clear`/'replace' forward・`_pgDel2`・`_rs`)
が `_imgPending.clear()` で全域 wipe しても「安全」と判断した — 根拠は役割1が
straggler 走査で代替できること。しかし役割2は代替不能: pending が消えれば
re-request は二度と飛ばず、blob 応答が一度でも喪失すれば図形は永久に
placeholder のままになる (再 park は `_oa`/`_attachShape` 経由でのみ再発生
→ その図形への後続 op or 再起動まで)。

## Defect (実害)

wipe で巻き込まれる存続図形:

- **`'replace'` keep 存続**: born が swap 時計より新しい図形は live オブジェクトの
  まま残るが `_attachShape` を経ず再 push される → 再 park なし → pending 抹殺。
- **`'clear'` forward keep**: 同型 (keep は wc 復元されるが pending は消える)。
- **`_pgDel2` (pageDel)**: 生存ページのメンバーの pending も全域 wipe (0753 で確認)。
- **`_rs` (ローカル取込/復元)**: ブート復元 (8730) で
  `shapes.map(Net._attachShape)` が park した直後に `_rs`→`_pcC` が即 wipe
  — **作成直後の pending をその場で殺す**最悪パターン。IDB に blob が無い
  (他端末で作った同期画像等) の参照は再送なしでは永久未解決。

再現性: join/復元直後に `img:` 参照が駐車している間に全置換が走ると、blob
応答喪失・遅延時に画像が永久 placeholder。

## Decision

全置換の **確定点** で `_pcR()` を呼び、生き残り図形の parked 参照を再 park:

```js
const _pcR=()=>{for(const s of _sh())if(_iS(s.img)&&!_du(s))_park(Net._imgPending,s.id,s.img)};
```

適用サイト (4 箇所):

| サイト | 位置 | 効果 |
|---|---|---|
| `'clear'` forward | `_pcC()` 直後 | keep 存続の pending 復活 |
| `'replace'` | keep push 直後 (fwd/back 共通) | keep + incoming 両方 (incoming は `_attachShape` で既 park、冪等) |
| `_pgDel2` | `_pcC()` 直後 | 生存ページメンバーの pending 復活 |
| `_rs` | `_pcC()` 直後 | attach 直後 park の即 wipe を無効化 |

`_park` は冪等 (id→{k,t0} 上書き) なので `Net._attachShape` 済みの incoming
clone への再適用も安全。t0 が更新されるのは意図的 — 再送窓の延長であり
「存続した」事実の反映。

削除図形の pending は依然として消えるべき → `_psc`(per-id purge) は
`_pcR` と無関係に機能し続ける (dead は `_sh()` に居ないので再 park されない)。

## Verification

`test.mjs` behavioural ピン (5 assert + 既存0753ピンの契約更新):

- remote `'replace'` keep 存続図形が swap 後も pending 保持 (`_pcR` で再 park)。
- pending が残っている間 `s.img` は参照のまま (blob 未着の正確な状態)。
- 後続の blob 到着で `dataUrl` 解決 + pending drain (解決経路は不変)。
- pageDel 生存メンバーも pending 保持 (0753 の `has===false` を新契約 `get().k===key` へ更新)。

`node test.mjs`: **3235 pass, 0 fail** (3230 + 5)、raw index.html **557,045B** (< 557,056B)。

## Consequences

- 「pending は fast index に過ぎない」という 0753 の前提に「再送ループの保持」が
  追加され、`_pcC` の全置換パージは **解決面でも再送面でも非破壊** となった。
- blob 応答喪失耐性が全置換イベントを跨いで維持される (join 直後の swap や
  undo of clear/replace でも画像が消えない)。
- `_pcR` は置換後の `_sh()` 全域走査 (O(n)) — swap は元々 O(n) 処理なので
  追加コストは微小。
