# ADR-1115 — 永続化因果マーカーの HLC floor fold (再水和境界)

## Status
Accepted (2026-10-01, round865)

## Context
ADR-1114 は *wire 上の* 外部時計の全受容経路 (17 サイト) で `_fTs` による floor fold を確立した。
残面は **disk 経由の受容**: `Persist.load` が IndexedDB の doc レコードを再水和する際、
`d.wc` (wclock) と `d.pages` (誕生/改名時計) は `_wAdopt`/`_pgAdopt` 経由で fold されるが、
**因果マーカー `d.rep` と文書名時計 `d.nts` は検証後 verbatim で復元**され、floor fold を迂回していた。

ADR-1114 の不変条件は「受容した時計 < 今後の自鋳造時計」だが、それは *admission* の定義を
wire 到着に限らない。IDB からの復元は wire と同じ admission 面であり、`d.rep`/`d.nts` の
`ts` は `_bName`/`_recordCommitted` が `nowTs()` で鋳造する同じ floor ドメインの値である。

## The gap
復元された persisted 外国スタンプが `_lastTs` を超えたまま残ると:

- `pages` が存在する doc では `rep.ts` は `_pgClk(d)` → `_bT` 経由で**偶発的に** fold される
  が、単一ページ文書 (`pages:null` — 最も一般的なケース) では `_pgAdopt` の fold が
  一度も走らず `rep.ts` は完全に迂回する。
- `d.nts` はページ有無に依らず floor に届かない (ページの `nts` は採用されるが doc 名時計は別物)。

次の自鋳造時計が persisted stamp より古いと:

1. **replace/全盤面 swap**: `op.clock.ts` < ピアが保持する `rep` marker → ピアは我々の snapshot を
   「swap より古い世代」として棄却 → 盤面内容が収束しない。
2. **改名**: `_bName` が mint する `ts` < ピアが保持する `_nameTs` → ピアは `_nameWin` LWW で
   我々の改名を敗者と判定 → 文書名が収束しない。

つまり **自分の書き込みが自分自身の persisted 因果履歴に負ける** — reload が発散窓になる。

## Decision
`Persist.load` の marker 復元でも `_fTs` を適用する:

```js
if(validClock(d.rep)){state._lastRep=d.rep;_fTs(d.rep.ts)}
if(_tsOK(d.nts)){_nameTs=d.nts;_fTs(d.nts);_namePeer=_idOK(d.ntp)?d.ntp:''}
```

- 値は verbatim 復元 (self-domain の仲裁値としてそのまま) しつつ、`ts` は floor に fold。
- 自分自身の stamp は既に floor ≤ stamp なので fold は no-op — 外国 stamp のみが効く。
- `restoreBackup`/import 系 (`:prev`, `.board`, share link) は wc/rep/nts を搬送しないので対象外。
- `_pgAdopt` の pages:null early-return を経由しないため、単一ページ文書でも確実に fold。

## Boundedness
`validClock`/`_tsOK` は既に wall+5min 上限を復元時に要求 — floor の fold は
その bound を変えない (ADR-0791 の bounds は維持)。

## Tests (test.mjs)
fake-IDB (`makeFakeIdb`) 経由で `Persist.load` の実経路を駆動する 4 ピン:
- ページあり doc の復元で rep/name clock が floor に fold
- `state._lastRep` が verbatim 復元される (self-domain 値)
- 復元後の `nowTs()` mint が全 restored stamp を上回る (不変条件本体)
- `pages:null` の単一ページ doc でも rep+name が fold (発生源ケース)

ソースピン: `_fTs(` 出現数 17 → 19 (wire 17 + persisted markers 2)。
