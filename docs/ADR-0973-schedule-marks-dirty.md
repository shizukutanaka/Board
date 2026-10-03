# ADR-0973: `_ps()` だけの変異が hidden/unload フラッシュをすり抜ける — `schedule()` が dirty を刻む

## 状態

採用 (実害修正 + ピン, v1.7.999)

## 文脈

PWA の永続化は 3 層: ① `Persist.schedule()` の 500ms debounce セーブ、
② `flushIfHidden(vis)` — `visibilitychange→hidden`/`pagehide` で pending タイマを
キャンセルして即時 save (beforeunload はモバイルで発火しないため hidden が本番経路)、
③ `beforeunload` — `_dt()` なら同期 save + 確認プロンプト。

②③ は両方とも **`_dt()` (state.dirty) でゲート**する。つまり dirty マークを
持たない変異は、500ms debounce が発射される前にタブが hidden/キルされると
**即時フラッシュが `!_dt()` でスキップされ、アーム済みタイマはページと共に死ぬ**
→ 無通知の消失 (silent loss)。

全 `_md(!0)` サイトは 4 箇所のみ (テキスト確定、snapshot-merge dirty 分岐、
`_commitDocName`、`_rdb`)。一方 `_ps()` は dirty を刻まない単独呼び出しが
複数残っていた — 「保存を予約する = 未保存状態がある」は定義上同値なのに
dirty 集合に入っていなかった。

## 実害 (再現経路)

| 変異サイト | 永続化フィールド | 消失条件 |
|---|---|---|
| `switchPage` (2106) | `state.curPg` | 切替後 500ms 以内に hide/kill → ADR-0674「最後のページが reload 後も生きる」が破れる |
| `'name'` 受信 (8220) | `docName`, `_nameTs`, `_namePeer` | リモート改名の採用が dirty 未刻印でフラッシュ対象外 |
| `_mergeSnapshotOp` 存在時計 (8284) | `wclock` (`_born`/`_del`) | merge された tomb/birth 時計が失われ収束状態を過去へ巻き戻す |
| `_applySnapshot` 末尾 (8331) | 盤面全体 + pages + docName | 参加時採用が dirty 未刻印 |
| docName `_CH` (9314) | `docName` | 入力 change 経路の改名が未刻印 |
| share-hash import (8610) | 盤面 + pages + docName | import 後の `_ps()` のみ |
| `'snapshot'` union-heal / `_lastRep` 採用 (8215/8217) | `state.pages`(+nts/ntp), `state._lastRep`, `_pgHealS` の pg 修復 | **`_ps()` すら呼ばれない** — shape merge が何も採用しなくても pages/rep の採用は永続化されない |

## 決定

1. **`Persist.schedule()` の先頭で `_md(!0)`** — 保存の予約は常に
   「未保存の変異がある」ことを意味する。全 `_ps()` サイト (上表 + 将来の追加分)
   が dirty 集合へ正しく入り、hidden/unload フラッシュが必ず発射する。
   一行で全欠陥面を閉塞する。

2. **`'snapshot'` ケース末尾に `_ps()`** — union-heal による
   `state.pages` の採用・ページ名 nts-LWW マージ・`_pgHealS` の s.pg 修復・
   `_lastRep` 因果マーカーの採用は、shape merge の有無に関わらず
   永続化対象の変異である。debounce 済みなので重複 arm は無害。

## 設計上の境界 (意図的に未変更)

- **`state.viewport` (pan/zoom)** — 連続変異。フレーム毎に schedule すると
  書き込みが増幅し、beforunload プロンプトが純粋ナビゲーションでも発火する。
  ビュー位置は「次のコンテンツ保存に便乗」の既存契約を維持 (curPg は離散
  イベントのため `_ps()` で担保 — 本 ADR で dirty にも入った)。
- **`Persist.load` (ブート)** — 読み込んだ文書は「未保存」ではない。
  dirty=false のままが正しい。
- `save()` 中の await 内の変異は既存どおり次の `_ps()` で再アームされる。
- 余分な beforeunload プロンプトは理論上増えるが、リモート op は既に `_rdb`
  経由で常に dirty を立てるため実用上の差は無い。

## 検証

- `Persist.schedule()` 後に `state.dirty===true` (チョークポイント契約)。
- 非空盤面への `'snapshot'` (union-heal 採用) で pages 採用 + `state.dirty===true`。
- `switchPage` で curPg 移動 + `state.dirty===true`。
- 既存 `flushIfHidden` ピン群 (clean+hidden→no save 等) はそのまま全緑。
- 3168 pass / 0 fail / raw 556,963B (上限 557,056B)。
