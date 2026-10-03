# ADR-0996: 全置換スワップ × 派生状態 — キャッシュ無効化の完備性監査

- ステータス: Accepted (監査完走、欠陥なし)
- 日付: 2026-10-01
- 関連: ADR-0009 (id index), ADR-0018/0019 (pen キャッシュ), ADR-0025/0047/0048 (_gridVer キャッシュ), ADR-0437 (wrapCache キー), ADR-0559 (overlay fold), ADR-0985 (imgq 再パーク), ADR-0995 (editor クロージャ re-bind)

## 背景

ADR-0995 は「クロージャに捕まった stale 図形参照」クラスを閉塞した。本ラウンドはその sibling 面として、**wholesale swap (remote 'replace'/'clear'、snapshot adopt、import `_rs`) が同一 id のオブジェクトを丸ごと差し替えたとき、全ての派生状態が新オブジェクトを解決できるか** を網羅的に検証した。by-id キャッシュが stale hit を返せばピア間で描画が発散し、by-object キャッシュが死んだオブジェクトを抱えればリークになる。

## 結論: 全7系統 clean

| 派生状態 | キー | 無効化機構 | 判定 |
|---|---|---|---|
| `_idIndex` (byId) | id | `_apply` 先頭 `_iG()` → `_idIndex=null` → 再構築 | clean |
| `_grpMap` / halo / search-match / minimap / DOM mirror | `_gridVer` | 同上 (apply 毎に `++_gridVer`) | clean |
| `_penCache` (pen bitmap) | id | 参照等価 sig `e.pts===p` + n/stroke/size + p0/mid/end | clean |
| `_penBboxCache` (G.bbox) | id | 同上 (`e.pts===p`) | clean |
| `_wrapCache` (wrapTextCached) | オブジェクト参照 (WeakMap) | swap → 新キー → miss → 再計算; 旧エントリは GC | clean |
| `_imgCache` / `Net._imgPending` | content-hash | 同キー=同画像 (真の冪等); `_pcR` が生存者を再パーク | clean |
| `_teFollow` / `_lblFollow` / `state.hover` / `ptr.gOrig`/`gAnc`/`dragStartShapes` | id (per-frame `byId`) / clone-map | 毎フレーム live 再解決か、ジェスチャ時は clone+commit 時再解決 | clean |

注目点は **`_idIndex` の同数スワップ**: `byId` の再構築条件は `!_idIndex||_idIndex.size!==_nS()` で、after が同数だと size 差でトリガされない — 唯一の防御は `_apply`→`_iG` による null 化であり、これが全スワップ経路 (replace/clear/snapshot/import) で共通チョークポイントとして効いていることを確認した。

## 検証 (test.mjs)

同一盤面で `_penBboxCache`/`_penCache`/`_grpMap`/`_wrapCache` を事前に温めた後、**同数の** remote 'replace' を `Store.applyRemote` 実経路で適用:

1. `byId('c1')!==preObj` — 同数スワップでも `_iG` が `_idIndex` を再構築
2. `G.bbox` が旧包絡を返さない + 新包絡 (x=98) を返す — ref-sig の stale 検出
3. `_penCache.get('c1').pts===byId('c1').pts` — bitmap キャッシュが新 pts ref へ再バインド
4. `_grpMapGet().get('gg')[0]===byId('c2')` — halo map がスワップ済みオブジェクトを返す
5. `wrapTextCached` が新テキストで 2 行を返す — WeakMap の再計算

6 assert、実害なし (欠陥は設計上既に閉塞済み)。
