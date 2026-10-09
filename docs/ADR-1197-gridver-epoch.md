# ADR-1197: `_gridVer` — 図形バージョンエポック: 単一ライター・単一漏斗・ビットマップ帯外チャネル

## 状態
規約化 (2026-10-01、clean 監査の契約ピン)

## 背景

派生状態を「図形が変わった」だけで無効化したい消費者が多数ある。従来は各キャッシュが
独自の更新判定を持っていたが、それでは更新漏れ (stale) と過剰更新 (毎フレーム O(n) 再構築)
の両方を招く。現在は **単一の版カウンタ `_gridVer`** が全消費者のエポックを統一する。

## 契約

### 1. 単一ライター

`_gridVer` の書込みサイトは厳密に2箇所のみ:

- `let _grid=null,_idIndex=null,_gridVer=0;` (初期化)
- `_invalidateGrid()` 内の `_gridVer++` — 同時に `_grid`/`_idIndex` を原子的にクリア

増分 bump 以外の代入は存在しない。これにより「_gridVer が変わった ⇒ `_grid`/`_idIndex`
も捨てられた」が恒真で、消費者側の追加無効化処理は不要。

### 2. 単一漏斗

全 op 適用は `_apply(op,forward)` の冒頭 `_iG()` を通る — forward も backward も、
全 17 種 (add/addMany/del/upd/move/group/ungroup/zorder/align/style/resize/replace/
pageAdd/pageDel/pageName/beautify/clear) 一律。**prop のみの変更 (upd/style) でも幾何
不変でも bump する** — mirror ラベル・検索テキスト・describeShape 出力は prop に依存する
ため、prop-op を版 bump から除外するとそれらが永久 stale 化する。

非 op 変異経路 (全置換 `_rs`、ページ採用 `_pgAdopt`、`switchPage`、消去バッチ復元、
ローカル直接書込み) もそれぞれ `_iG()` を直接呼び、`_recordCommitted` は dedup 早期 return
を含む全 commit でベルト的に bump する。

### 3. エポック共有の消費者

| 消費者 | キー | ADR |
|---|---|---|
| `_grid`/`_idIndex` (空間索引・byId) | `_invalidateGrid` が再構築を遅延 | 0009/0016/0032 |
| `_mirrorVer` (DOM ミラー) | `_mirrorVer===_gridVer` で早期 return | 0041/0956 |
| `_sqVer` (検索マッチリスト) | `{_sqVer===_gridVer && _sqQ===q}` | 0048 |
| `_grpMapVer` (グループハロー) | `_grpMapVer===_gridVer` | 0047 |
| snap エッジ索引 slot | `slot.ver!==_gridVer` で再構築 | 0020 |
| `_sceneVer` (ミニマップ scene bitmap) | `_sceneVer!==_gridVer` で再描画 | 0025 |

### 4. 帯外チャネル (bitmap)

画像 blob の到着は図形データを変えないため `_gridVer` は **bump しない**:
`img.onload` → `_iv()` + `Minimap.invalidateCache()`。これを `_iG()` すると
blob 到着ごとに O(n) の索引/ミラー/ハロー再構築が走り、大画像盤面で UI が詰まる。
版は「図形データ構造」の版であり、「図形が参照するバイト列」の版ではない。

## 検証 (round947)

- `_apply` 冒頭 `_iG()` — ソース直接確認。
- `_gridVer=[^=]|_gridVer++` のライターサイト数 === 2 (init + bump)。
- `img.onload=()=>{_iv();Minimap.invalidateCache();}` — 帯外チャネル維持。
- 挙動: prop-only リモート `upd` (label Alpha→Beta) で mirror が 'Beta' へ再構築、
  `_sqMatches` が新クエリで1件ヒット、ローカル commit→undo で 'Beta' へ復帰 — 双方向で版が進む。

## 意図的な非対称

`_gridVer` を共有しない消費者: peer カーソル/選択・toast・style panel (選択署名駆動)。
これらは図形データの版ではなく自分の署名で無効化する — 混ぜると版 bump が
UI 再構築と結合して描画コストが非線形化する。
