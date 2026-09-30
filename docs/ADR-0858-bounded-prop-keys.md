# ADR-0858: Bounded prop keys at intake (junk-prop flood)

## 状態 (Status)
実装済み (v1.7.884)

## コンテキスト (Context)

`validPatch` と `validShape` は「既知キーの値が妥当か」だけを検査する — 未知キーは
`_cleanVal` の proto/constructor/prototype 拒否を抜けてそのまま通過する。着地点は2箇所:

1. `_apply` 'upd'/style/align/beautify — `_stripStruct` が `id`/`type`/`_` 接頭辞のみ剥がし、
   残り全キーを `_oa`(=Object.assign) で図形本体へ書き込む → `s.evilKey` が図形に載り、
   `.board` エクスポート・IDB 永続化・snapshot で他ピアへ伝播する。
2. `_stampWrites` — `op.after` の全キーを per-shape wclock (`wclock[id][key]=clock`) に刻む。
   攻撃者命名キーは無制限に増殖できる: 図形数のフラッドキャップ (ADR-0738, 8192) は
   shape 単位であり、**shape 内キー数には上限がなかった**。
3. `_mergeSnapshotOp` — snapshot の `w` フィールドが持つリモート wclock を `lw[k]=rc` で
   そのまま取り込み、`ex[k]=v` で図形にも書く → ジャンク鍵は参加直後のピア全員へ波及する。

1 つの 24MB op は ~100 万の未知キーを運べるため、リモートピアは全ピアの wclock と
永続ボードに任意サイズのジャンクプロップを注入できた。

## 決定 (Decision)

両 intake ゲートにキー数上限を設ける: 実プロップ宇宙は ~57 (id,type,座標,pts/way,
aF/bF,スタイル,束縛,ページ等) のため **64 キー超の patch/shape を拒否**する。

- `validPatch`: `!_iO(p)||_ok(p).length>64` — upd/style/align/beautify/move patches、
  snapshot merge の per-prop ゲートを一括カバー
- `validShape`: `!_iO(s)||_ok(s).length>64` — add/clear/replace/import 全経路をカバー

「bound, don't whitelist」: ADR-0373 の structural strip と同じ系譜で、正規名簿を
持たず件数で縛る。ジャンク少量流入 (≤64 鍵) は描画・LWW に不活性のまま残るが、
無制限増殖と wclock 洪水を閉塞する。

## 影響 (Consequences)

- 正当な patch は最大 ~57 キー (全プロップ同時 patch) のため拒否されない
- 既存 snapshot/`w` フィールド内のジャンク鍵は `validClock` とは別に、
  merge 時の `validPatch({[k]:v})` 経路でもキーが単発なら通る — 件数が 64 超の
  shape/パッチ由来でない限り不活性 (残存リスクとして受理)
- コスト +~100B (raw 557,028B / 上限 557,056B)

## テスト (Verification)

- `validRemotePayload({op:'upd',after:{k0..k64}})` → false (wire 経路実検証)
- `validShape({…65 keys})` → false
- `node test.mjs` 全緑
