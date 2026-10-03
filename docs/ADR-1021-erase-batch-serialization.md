# ADR-1021 — mid-erase members must still serialize

## 背景

`eraseAt` はストローク中にヒット図形を `_sh()` から splice して `_eraseBatch` へ退避し、
`flushErase` (pointerup/cancel) で一括 `del` op をコミットする。つまり **ストローク中の
batch メンバーは依然として盤面上の生きた図形**である —— del op はまだ存在せず、
undo・wire・永続化のいずれにも「消えた」記録がない。

監査対象: `_sh()` を一括シリアライズする全経路が mid-erase の batch を含むか。

## 発見した実害

`_unB()` (batch を `_sh()` へ戻してクリアする破壊的操作) は intake 側の
tomb-or-keep スキャン (ADR-0953: `_apply` 全置換・`_pgDel2`) のみに存在し、
**出力側のシリアライズは全て生 `_sh()` を読んでいた**:

| 経路 | 参照 | 影響 |
| --- | --- | --- |
| `Persist.save()` | `_imgSlim(_sh())` | debounce/`flushIfHidden`/`beforeunload` が mid-erase で発火すると batch 図形のない doc を書く。タブ死亡で **del op・`:prev` backup もない永続喪失**、ピア側には残存 → 一方向発散 |
| `Persist.saveBackup(shapes)` | `_imgSlim(shapes)` | mid-erase の clear/import が `:prev` へ batch 抜きの backup を書く → 復元でも喪失 |
| `Net._snapshotMsg()` | `_sh().map` | sync-req 応答が batch を抜く → joiner は 'add'-only マージでそれらを**永久に受信しない** |
| `exportBoard`/`exportDrawio`/`copyBoardJSON`/`exportToUrl`/`excScene` | 既定 `=_sh()`/`_sh()` 直読み | 生成アーティファクトからメンバーが静かに欠落 |

なお `_unB()` を `save()` 内で呼ぶ案は不可: batch を空にする破壊的操作で、
(a) 以後の `flushErase` が batch を二重 push して id 重複、(b) 既に退避済みの図形が
`_sh()` に残り erase 意図自体が消失する (ピアと整合するが UX 破壊)。

## 決定

非破壊 union `_shWB()` を追加し、`_sh()` をシリアライズする全経路へ適用した:

```js
const _shWB=()=>_ln(_eraseBatch)?_sh().concat(_eraseBatch):_sh();
```

適用サイト: `Persist.save` (doc)、`Persist.saveBackup` (`shapes.concat(_eraseBatch)`、
呼出側が `clone(_sh())` や `before` 配列を渡すため内部で union)、`Net._snapshotMsg`
(ops の生成元)、`exportBoard`/`exportDrawio`/`copyBoardJSON` の既定引数、
`exportToUrl` の `roundShapesForExport`、`excScene` 呼出 (`_shWB().filter(⇒_sv&&_pgOk)` で
ADR-0658/0678 の可視+ページスコープを維持)。

除外 (設計意図): `_shV()` 由来の可視レンダー系 (PNG/SVG/PDF/copy/copySVG、minimap、
`selectAll` 等) — 描画面として「消し掛け = 非表示」はストロークの見た目と一致し、
キーボード export 中の一時的な見た目差のみで永続影響なし。選択由来経路
(`doCopy`、exportSelection) は batch id が byId 解決不能で自然に除外済み。

## 契約

- **`_sh()` を一括シリアライズ (persist/wire/file-export) する新規経路は `_shWB()` (または
  `.concat(_eraseBatch)`) を使い、生 `_sh()` を読まない。**
- `_unB()` は intake 側の tomb-or-keep スキャン専用。出力側で呼んではいけない。
- 可視レンダー系 (`_shV()`) は除外してよい (ストローク中の見た目と一致)。

テスト: `Net._snapshotMsg()` が batch メンバーを含む behavioural ピン + 各サイトの
ソースピン 6 assert (test.mjs)。
