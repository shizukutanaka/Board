# ADR-0646: 多ページ (multi-page boards)

## 状況
spec §14.3 ロードマップ唯一の未完項目だった「多ページ」。1 盤面のみで、
ページの追加・切替・削除・改名の仕組みが無かった。

## 決定
`pages`/`curPg` + `s.pg` 帰属モデルで実装する。

- `state.pages = [{id, name, nts}]` — 2 ページ目が作られるまでは **null**
  (単一ページ盤面はゼロオーバーヘッド)。64 ページ上限。
- `state.curPg` — **ローカルのビューフィルタ**。op には乗せない「どの
  ページを見ているか」。複数ピアは同一の収束盤面の異なるページに居てよい。
  `'replace'` やスナップショットで `curPg` が届いた場合は「採用するページ
  集合に存在する id のみ受け入れる」アドバイザリとして扱う。
- `s.pg` — 図形の帰属ページ id。`pg` を持たない図形は**位置的に**
  `pages[0]` に属する (ページ機能以前のデータの無段階移行)。
  `Shape.make`/`_placeCopies` が `state.curPg` をスタンプ。
- ワイヤ op: `pageAdd` / `pageDel` / `pageName` を `REMOTE_OPS` に追加。
  - `pageAdd` forward は、受信側の `pages` がまだ null なら `[{id, name}]` を
    先頭ページとして作り、既存の unpg'd 図形を全て `pg=op.id` にスタンプして
    `curPg` をその id に置く — 送り手が「ページ1」を先に commit してから
    新ページを commit するので、受信側は同じページ列を再構築できる。
  - `pageDel` は対象ページ + 帰属図形を除去 (2 ページ未満にはしない)。
    backward はページを `op.i` へ差し戻し、`op.shapes` を `addMany` 経路で復元。
  - `pageName` は `p.nts` ベースの LWW (rename → name timestamp)。
  - undo 配線: `pageName→pageName(after↔before)`、`pageAdd→pageDel`、
    `pageDel→[pageAdd(@i), addMany(shapes)]`。
- `'replace'` op は `pages`/`beforePages`/`curPg`/`beforeCurPg` を同梱し、
  全置換がページ集合も収束させる。`'clear'` は forward で `pages/curPg` を
  null 化 (ページなしの単一盤面へ戻る)。
- スナップショットは `pages`/`curPg` を同梱。片方がページを持たない場合の
  マージは union-heal (未知ページを 64 上限で末尾へ追加、ローカルの curPg
  を維持)。リモート図形の未知 `pg` は `{id, name:'?', nts:0}` スタブを修復。
- `_pgOk(s)` フィルタを**全ての図形走査面**に適用: draw 両ループ、
  pickTop、snap 対象、`_bindAt`、lasso、search、`_sqList`、`_grpMap`、
  `_frameOf` メンバー、minimap、DOM ミラー、export (`inView`/PNG/SVG/
  excalidraw/.drawio)、`withFrameChildren`、ピア選択輪郭。不変条件:
  **他ページの図形はローカル経路から到達不能** (hidden parity と同型)。
- キャッシュ不整合: `switchPage` が `_iG()` (`_gridVer` bump) を呼ぶ —
  `_grpMap`/`_sqList`/snap 索引/minimap/`_drawIter` は全て `_gridVer` 連動
  なので一括で無効化される。
- 永続化/互換: IDB `put`/`load`/`:prev` バックアップ、`.board` エクスポート、
  share URL、クリップボード JSON が `pages`/`curPg` を往復。旧フォーマット
  (フィールド無し) は `pages:null` として読まれる。
- UI: ステータスバーに `pgBar` (`‹ 名前 › + ✕`)。表示は `pages` が
  ある時のみ (`hidden`)。削除は `confirm` 付き (帰属図形ごと消える)。

## 検証
`test.mjs` +16 asserts: 単一盤面 → `_pgAdd` で 2 ページ、帰属スタンプ、
`_pgOk` フィルタ、`switchPage` 反転、`pageDel` forward/undo/redo、
`pageName` の LWW (古いリモートは負ける)、ページ無し盤面へのリモート
`pageAdd` でのスタブ採用、未知 `pg` のスタブ修復、スナップショット
union-heal。`RAW_CEILING` を 512→544KiB (実装 +8.9KB; 上限は
runaway-growth ガードであり厳格な予算ではない — CLAUDE.md 準拠)。

## 非目標
ページの並べ替え・サムネイル・ページごとの IDB レコード分割・
ページ別エクスポートは後続。`pgBar` はページ名のみ表示しサムネを持たない
(単一ファイルの軽さを保つため)。
