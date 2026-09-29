# ADR-0413: `s.shadow` をフラグ prop 検証へ移動 (sync/import 棄却バグ修正) + shorthand fold

## 状態
実装済 (v1.7.448)

## 背景
ADR-0367/0369 の validPatch 数値 whitelist に `'shadow'` が入ったが、
`toggleShadow` は `s.shadow=true` (boolean) を書く — `typeof true!=='number'`
で **全ての shadow 関連ペイロードが棄却** されていた:

- `style` op `{shadow:true}` → remote ピアへ一切届かない (トグルの同期断)
- `add`/`addMany`/`del`/`clear` op に shadowed shape を含む → op ごと棄却
- `.board` ファイル / 共有リンク import (`validShape`→`validPatch`) →
  shadowed shape が沈黙で drop

加えて `_mergeSnapshotOp` の per-prop ゲートでも `shadow:true` が skip
されていた (他 prop は merge されるのに shadow だけ取り残される)。

## 決定
- `'shadow'` を数値リストから `'bold','italic','under','strike','locked'`
  と同じ boolean|number フラグチェックへ移動 — 書き込み側は
  `true`/`delete` のまま (既存データとの互換性を保持)。
- 機能テストを validRemotePayload で追加: `shadow:true`/`shadow:1`/
  `bold:true`/`shadow:null` 受理、`shadow:'yes'` 棄却、
  shadowed shape の `add` op 受理。
- shorthand fold: `_db`(document.body×5)、`_de`(document.documentElement×4)、
  `_wO`(window.open×3) — ~105B 回収。
  `_mM`(matchMedia) はテストが `fakeWin.matchMedia` を後付け差替えするため
  キャプチャ不可 — 差し戻し。

## 影響
- shadow トグル・shadowed shape の追加/削除/import が remote peer と
  ファイル経路で正しく動作する (実害バグの修正)。
- 診断価値: whitelist 追加時は「その prop を実際に書く値の型」を
  全書込みサイトで確認する必要がある。

## 断念した代替案
- 書き込み側を `s.shadow=1` に正規化: 既存の `shadow:true` データ
  (.board/IDB/snapshot) が依然棄却されるため不十分 — 型側を広げた。
