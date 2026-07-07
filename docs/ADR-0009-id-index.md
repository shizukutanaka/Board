# ADR-0009 — `byId` の O(1) 化 + キャッシュ無効化の一本化

- Status: Accepted (implemented)
- Date: 2026-07-01
- 関連: CLAUDE.md「100点への距離」パフォーマンス項目、`docs/audit-2026-06.md`

## なぜ (Context)

CLAUDE.md は以前から「`byId` O(n) 線形探索の解消」を未着手のパフォーマンス項目として
挙げていたが、具体的な影響範囲は検証されていなかった。実際に調べると:

- `function byId(id){return state.shapes.find(s=>s.id===id)}` — 単純な線形走査。
  ファイル内で **74 箇所**から呼ばれている。
- `connEnds(s)` はバインドコネクタ1本につき最大2回 `byId` を呼ぶ。`connEnds` は
  `drawShape` の line/arrow ケースから呼ばれ、これは **RAF 描画ループの中**にある
  (ミニマップ描画・ハンドル計算・ラベル位置計算からも呼ばれる)。図形数×コネクタ数の
  線形走査が理論上ではなく実際に毎フレーム発生することを確認した。

さらに調査の過程で、**関連する既存バグ**を発見した: 空間グリッドキャッシュ `_grid`
(`pickTop` が図形40個超で使うヒットテスト高速化)の無効化は `Store._recordCommitted`
と `Store._apply` の冒頭2箇所でのみ `_invalidateGrid()` が呼ばれているが、
`state.shapes` を直接再代入/splice する経路が他に9箇所存在し、その一部
(`Net._applySnapshot`、`.board` インポート、URLハッシュ共有インポート、
ADR-0004 バックアップ復元)はこの2つの関数を経由しない。これらの経路の直後は
`_grid` が古い(場合によっては空の)配列から構築されたまま残り、次にユーザーが
何か操作するまで `pickTop` のヒットテストが誤動作しうる。

## 何を (Decision)

1. **無効化を一本化**: `_invalidateGrid()` を「id インデックスも空間グリッドも
   無効化する」関数に拡張(名称はそのまま、呼び出し側の変更を避ける):
   ```js
   function _invalidateGrid(){_grid=null;_idIndex=null;}
   ```
2. **`byId` を lazy-rebuild Map に変更**、加えて**サイズ不一致検出**を安全網として実装:
   ```js
   let _idIndex=null;
   function byId(id){
     if(!_idIndex||_idIndex.size!==state.shapes.length){_idIndex=new Map();for(const s of state.shapes)_idIndex.set(s.id,s);}
     return _idIndex.get(id);
   }
   ```
   実装中に判明した事実: `Store._apply` の 'add'/'addMany'/'del' 各ケースは **`byId` 自身を
   冪等性チェック/ロック確認に使ってから、同じケース内で `state.shapes.push`/`splice` する**
   (例: 'add' forward は `if(!byId(op.shape.id)){state.shapes.push(...)}`)。これは
   `_apply` 冒頭の1回の `_invalidateGrid()` だけでは防げない — その `byId` 呼び出し自体が
   **push/splice 前の状態からキャッシュを再構築**してしまい、直後の push/splice が
   キャッシュに反映されないまま次の呼び出し元(例: `applyStyleToSelection` の直後呼び出し)
   に渡ってしまう。当初「膜変化(membership)を伴う9箇所の外部再代入だけ抑えれば十分」と
   想定していたが、`_apply` **内部**のこのパターンをテストで実際に踏み抜いて発見した
   (`node test.mjs` 実行時、既存の「align」「dash applied to selection」テストが
   `add` 直後の `applyStyleToSelection`/整列呼び出しで唐突に落ちた)。すべての内部呼び出し
   箇所を1つずつ塞ぐ代わりに、`byId` 自身に `_idIndex.size!==state.shapes.length` の
   チェックを持たせることで、**どの経路であれ次の `byId` 呼び出し時に必ず気づいて
   再構築する**汎用的な安全網とした。
   図形のプロパティ変更(位置・スタイル等)は id→参照の対応を壊さないため無効化不要。
   `sortZ()` は in-place ソートで membership 不変のため無効化不要。無効化が必要なのは
   「図形の追加・削除・配列の再代入」のみ。
3. **無効化漏れの解消**: 既存の2箇所に加え、以下 9 箇所の直後に `_invalidateGrid()`
   呼び出しを追加する(すべて `state.shapes` の再代入または splice):
   `Net._applySnapshot`、Persist ロード、`importFromHash`、ADR-0004 バックアップ
   復元、`importBoard`、消しゴムの楽観的復元(3箇所)。これは本 ADR の「ついでの
   修正」ではなく、**`_idIndex` を正しく保つために必須の前提**であり、同時に
   上記の空間グリッド陳腐化バグそのものを修正する。
4. **`Store._apply` 内のインライン `state.shapes.findIndex(s=>s.id===...)` は
   変更しない**: これは削除対象の配列内位置(splice用インデックス)が必要で
   `Map` では代替できない。呼び出し頻度も op 適用時のみでホットパスではない。

## 代替案 (Alternatives)

- **`state.shapes` を配列でなく `Map` そのものに変更**: 却下。z順序を保持した反復
  (`for(const s of state.shapes)`)・`state.shapes.length`・`.filter`/`.map` 等の
  既存コードが広範囲に依存しており、データ構造の総入れ替えは影響範囲がリスクに
  見合わない。配列を正とし、Map を派生キャッシュとして持つ方が安全。
- **`state.shapes` の全ミューテーションを Store 経由に強制し、Proxy 等で自動無効化**:
  却下。過剰設計。既存の `_invalidateGrid()` という確立済みの単純なパターンに
  1行足すだけで同じ安全性が得られる。
- **消しゴムの逐次 splice ごとに無効化しない(バッチ終了時のみ)**: 検討したが、
  `eraseAt` は描画中に `pickTop`/`byId` で毎回ヒットテストする必要があり、
  ストローク中の消去対象も正しく引けなければならないため、splice の都度の無効化が
  必須(バッチ終了時のみでは消去中の当たり判定が壊れる)。

## 影響 (Consequences)

- 新規モジュール変数 `_idIndex`(既存の `_grid` と対になる)。
- `byId` のシグネチャ・戻り値は不変 — 74 箇所の呼び出し元は無変更。
- 消しゴムストローク中は1回の splice ごとに次の `byId`/`pickTop` 呼び出しで
  O(n) 再構築が起きるが、これは現状の「常に O(n)」と同オーダーであり退行ではない。
  多くの操作(単一図形の追加・削除・undo/redo)は「1回の無効化 → その後の複数回の
  O(1) 参照」という真の高速化になる。
- 空間グリッドの陳腐化バグが同時に修正される(前述)。
- テスト: add/addMany/del(+undo)・`_applySnapshot`・消しゴム(`eraseAt`+`abortGesture`)
  それぞれの直後に `byId` が正しい参照(新id→取得可、削除id→undefined)を返すことを
  固定。既存テスト全体(143+ 箇所)が使う `state.shapes=[]`/`state.shapes.length=0`
  という直接リセットパターンは `_idIndex` を無効化しないため、全リセット箇所に
  `_invalidateGrid()` 呼び出しを機械的に追加した(グローバル置換、個別レビュー不要な
  定型変更)。
