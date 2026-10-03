# ADR-0917 — `beautify` にも構造キー strip を適用 (type は _TYPES ゲート)

## Defect

style ファミリ適用サイト (style/resize/align/beautify 共通パッチループ) が
`if(op.op!=='beautify'){…strip…}` と `beautify` を全構造除去から免除していた。
`beautify` は ADR-0730 から wire op であるため、鍛造 remote
`beautify{after:[{id,pg:'x',frac:'z',groupId:'g',_k:1,type:'bogus'}]}` は
**1 op で 0912/0913/0916 の全 strip を迂回して着地した**:

- `pg` — 図形を表示ページから追放 (0912 と同系統、免除面だけで生存)。
- `frac` — z-order 攪乱: `clockNewer`/`_lwwSkip` 仲裁を受けずに frac 書換え
  (0913 同型)。ターゲット frac が正規 zorder op から離れた値になるため
  収束でも回復しにくい。
- `groupId` — 幻影グループメンバシップ→halo/選択カスケード (0916 同型)。
- `_`-prefixed — `_img`/`_pBmp` 等内部キャッシュキーの上書き。
- `type` — `bogus` 等の非図形型が着地 → 描画は `_dS` で隔離されるが
  snapshot/export/ミラーに未知型が伝播。`upd`/`style` では type は常に
  落とされるが、beautify は**正当に type を運ぶ** (pen→rect/ellipse/line) ので
  `strip` ではなく `_TYPES` enum ゲートを採用。

`stamp()` は op 非依存で `type`/`pg`/`frac`/`groupId`/`_` を既にスキップするため
(0914/0916)、wclock 側にこの免除経路は存在しなかった — **strip のみの同族穴**。

## Change

適用サイトの免除分岐を除去し、beautify は `type` を `_TYPES` 所属時のみ保持:

```js
const p=clone(raw);
delete p.pg;delete p.frac;delete p.groupId;
if(p.type!=null&&(op.op!=='beautify'||!_TYPES.has(p.type)))delete p.type;
for(const k of _ok(p))if(k[0]==='_')delete p[k];
```

- style/resize/align: 従来どおり `type`/`pg`/`frac`/`groupId`/`_` 全除去。
- beautify: `pg`/`frac`/`groupId`/`_` 除去 + `type` は `_TYPES` enum のみ通過。

`validPatch`/`validRemotePayload`/`_lwwDrop` には変更なし — 構造鍵は依然
wire 上では検証済み文字列として合法 (後方互換) で、適用直前の strip が
着地を防ぐ。ローカル producer (`doBeautify`) は type/geom のみ生成するため
合法 beautify の挙動不変。

## Test

test.mjs 実動作ピン: 鍛造 `beautify` op (type:'bogus', pg/frac/groupId/_evil 付き)
を `B.Net._onRecv` → `applyRemote` へ流し、`x:77` は着地・構造鍵と非 `_TYPES`
type は全て除去され `frac`/`type` は sortZ 値・既存値のままを検証。

ハーネス注意点: `reset(W)` は A 側 `_invalidateGrid` のみ呼ぶため、B 側に
形状を積むピンでは `B._invalidateGrid()` の明示呼出が必要 (旧 `_idIndex` が
`size===_nS()` を満たして stale のまま `byId` 失敗を起こした)。
