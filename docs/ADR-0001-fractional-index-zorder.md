# ADR-0001 — z 順序を fractional indexing に置き換える

- **状態**: Accepted — **Step 1〜3 実装済** (2026-06-14)。Step 4 は Proposed。
- **日付**: 2026-06-13
- **関連**: `docs/research-improvements.md` 項目A (★最優先) / `docs/spec.md` §13 既知の未充足 /
  `docs/architecture.md` Store セクション
- **影響範囲**: P0 可逆性 (op-log)、sync (BroadcastChannel/WebRTC)、永続化 (IndexedDB)、
  既存保存ボードの後方互換

> 本 ADR は CLAUDE.md WORKFLOWS「新機能追加前に ADR を書く」に従い、**コードは変更せず**
> 設計判断のみを記録する。実装は承認後に着手する。

## コンテキスト — 現状の z 順序モデル

各 shape は整数 `z` を持つ。描画順・ヒット順は **配列順** (`state.shapes`) で、配列は
`sortZ()` が `z` 昇順に並べ替えて維持する (`index.html`):

- `sortZ()` → `state.shapes.sort((a,b)=>(a.z||0)-(b.z||0))`
- `nextZ()` → `max(z)+1` (新規作成・貼り付け時)
- 描画は配列順を 2 パス走査 (frame 群 → 非 frame 群、`draw()`)

z 順序変更は 4 操作: `doBringFront / doSendBack / doBringForward / doSendBackward`。
いずれも **配列の splice/swap と `z` 値の両方**を更新し、`_commitZ(before)` で
`zorder` op を記録する。

### `zorder` op の現状 (問題の核心)

```
{op:'zorder', before:[{id,z},...], after:[{id,z},...]}   // 全 shape のスナップショット
```

- `_zSnapshot()` は **全 shape の {id,z} を配列順で**記録する。
- `_apply` の `zorder` 分岐は、スナップショットから **z 値と配列順の両方を完全復元**する
  (`next` 配列をスナップ順に再構築)。これにより tie (z 同値) があっても逆操作が厳密に一致する。

この「全スナップショット」方式は**逆操作が厳密**である一方、以下の問題を持つ:

1. **履歴肥大**: z 操作 1 回ごとに O(n) の {id,z} 配列を 2 つ (before/after) 保持。
   大規模ボードで履歴メモリが膨らむ。
2. **帯域肥大**: `zorder` は `REMOTE_OPS` に含まれ sync 時に全 shape 配列をブロードキャストする。
   1 図形を前面に出すだけで全 shape 分を送る。
3. **sync 衝突に弱い**: 全置換のため、2 ピアが別々の図形を並べ替えると **last-writer が全順序を
   上書き**し、もう一方の並べ替えが失われる (LWW が配列全体に効く)。

## 決定 — fractional indexing (between-keys)

整数 `z` を **稠密順序キー** (fractional index) に置き換える。隣接 2 要素の間に新しいキーを
**常に生成可能**な順序キーを採用し、並べ替えを「**動かす 1 図形のキーを 1 つ更新する**」操作にする。

### キー表現の選択肢

| 案 | 例 | 長所 | 短所 |
|---|---|---|---|
| A. 文字列 base62 between-key (Figma/Jitter 系) | `"a0"`,`"a0V"`,`"a1"` | 無限に挟める / 文字列比較で安定 / 桁が伸びにくい | 実装が要 (生成関数 ~40行) |
| B. 浮動小数の中点 | `(zPrev+zNext)/2` | 実装が最小 | 53bit で枯渇 (連続挿入で破綻) → 周期的 renumber が必要で P0 を再び汚す |

**採用: 案A (文字列 between-key)**。浮動小数中点は枯渇リスクで結局 renumber が必要になり、
本 ADR の動機 (全置換の排除) を再導入してしまう。文字列キーは枯渇しない。

### 順序キー生成 (依存ゼロ、~40行で内蔵)

`keyBetween(a, b)` を実装する (a < b、いずれかは null 可):

- `keyBetween(null, null)` → 中央キー (例 `"a "` 相当)
- `keyBetween(a, null)` → a の直後 (末尾追加 = bringFront)
- `keyBetween(null, b)` → b の直前 (先頭挿入 = sendBack)
- `keyBetween(a, b)` → a と b の中間文字列

実装は Observable / Figma 公開アルゴリズム (base-95 or base-62 桁繰り上げ) の自前移植。
外部依存は追加しない (CLAUDE.md 不変条件)。

## op-log への影響 (P0 可逆性)

### `zorder` op を per-shape の最小デルタに変更

```
{op:'zorder', changes:[{id, before:"<key>", after:"<key>"}, …]}   // 動いた図形のみ (単数も同形)
```

(実装は単一図形も `changes` 配列 1 要素で統一した — 分岐を増やさないため。)

- `_apply(forward)` は `changes` の各 `{id}` に `forward?after:before` を代入し `sortZ()`。
- 逆操作は対称 (before/after を入れ替えるだけ)。**動いた図形のみ**を保持 → 履歴 O(変更数)。
- tie 問題は **キーが一意**であれば消える。生成時に衝突回避 (後述) すれば配列順 = キー順が一意に定まり、
  全順序スナップショットは不要になる。

### 配列順 vs キーの正準性

現状は配列順が描画の正準。移行後は **キーが正準**、配列はキー順にソートした派生 (`sortZ` を
キー比較に変更)。これにより「配列順を別途復元する」必要が消え、逆操作が単純化する。

## sync への影響

- per-shape キー更新は **可換性が高い**: 2 ピアが別図形を動かしても互いのキーを上書きしない。
- 同一ギャップへの同時挿入で **キー衝突**しうる → **決定的タイブレーク**で全ピアが同一順序に収束させる。
  当初案は `key + '#' + peerId` だったが、実装では**より単純に `shape.id` でタイブレーク**した
  (`sortZ` の比較を `(frac, id)` に変更)。`shape.id` は `uid()` で globally-unique かつ全ピアに複製済みなので、
  peer を別途追跡せずとも衝突した 2 図形は全ピアで同じ順序に並ぶ。interleaving は許容 (Figma の見解)。
- `validRemotePayload` の `zorder` 検証を強化: `changes` 配列の各要素が `id:string` かつ
  `before/after` が string|undefined であることを確認 (不正キー注入で比較が壊れるのを防ぐ)。旧 `after`
  スナップショット形式も引き続き受理。

## 永続化・後方互換 (最重要リスク)

既存保存ボードは整数 `z` を持つ。**マイグレーションが必須**:

- `Persist.load` / スナップショット取り込み時、shape に文字列キーが無く整数 `z` のみなら、
  **z 昇順に並べて連番 between-key を一括採番**する純粋関数 `migrateZKeys(shapes)` を通す。
- 共有 URL・`.board` ファイル・IndexedDB の三経路すべてで同一マイグレーションを適用 (表示=保存)。
- 旧フォーマットの読み込みを壊さないこと、マイグレーションが冪等であることをテストで保証。

## テスト計画 (実装時)

1. `keyBetween` の property test: 任意の a<b で a < keyBetween(a,b) < b、N 回連続挿入で順序保存・
   キー長が線形以下。
2. `zorder` 新 op の往復: apply→undo=初期 / redo=適用後 (既存 PBT 30 シナリオに z 操作を追加)。
3. マイグレーション: 整数 z ボード → キー付与後に描画順が不変、冪等。
4. sync: 2 ピアが別図形を bringFront → 両方の結果が保存される (現状は片方消失)。
5. 同一ギャップ同時挿入 → peerId タイブレークで決定的順序。

## 代替案 (却下)

- **現状維持 (全スナップショット)**: 逆操作は厳密だが履歴/帯域/sync 衝突の 3 問題が残る。
  ボードが小さいうちは実害が小さいため**今すぐ撤去はしない**が、sync 本番化 (Phase 1.1) の前提として不可避。
- **浮動小数中点**: 前述の枯渇問題で却下。
- **整数 + 周期 renumber**: renumber が全 shape 更新を再導入し本 ADR の動機を打ち消す。却下。

## 段階的移行 (一度に全部はやらない)

1. **Step 1 ✅ (実装済 2026-06-14)**: `keyBetween` を内蔵し、各 shape に派生キー `frac` を持たせ、
   `sortZ` をキー比較に切替。描画正準をキーへ移した。z 操作 (4種) は据え置き (整数 z と並走)。
   `zorder` op のスナップショットは `{id,z,frac}` を持ち、undo がキーも厳密復元する。
   旧ボード (整数 z のみ) は **初回 `sortZ` で自動マイグレート** (z 昇順にキー付与) — 独立 `migrateZKeys`
   関数は不要だった。588 tests 緑。
2. **Step 2 ✅ (実装済 2026-06-14)**: 4 つの z 操作 (前面/背面/前へ/後ろへ) を per-shape キー更新に
   書き換え、`zorder` op を **`{op:'zorder',changes:[{id,before,after}]}` の最小デルタ**化。動いた図形のみ
   履歴/ブロードキャストに載る (1 図形の前面化 = 1 エントリ。旧: 全 shape スナップショット)。`_apply` は
   新フォーマットを主とし、**旧スナップショット形式も defensive に保持** (混在バージョン peer / 既存履歴)。
   `validRemotePayload` を新形式 (`changes` 配列) に対応。587 tests 緑。
3. **Step 3 ✅ (実装済 2026-06-14)**: 同時並べ替えのキー衝突を **`sortZ` の `(frac, id)` 比較**で
   決定的にタイブレーク → 全ピアが同一順序に収束。`validRemotePayload` の `zorder` 検証を強化
   (`changes` の各要素が `id:string` / `before,after` が string|undefined)。587 tests 緑。
4. **Step 4**: 整数 `z` フィールドを廃止 (完全移行)。

各 Step は独立リリース + テスト緑。Step 1〜2 で履歴/帯域問題が解消、Step 3 で sync 衝突が解消。

### Step 1 実装メモ

- **キー表現**: base62 (`0-9A-Za-z`)。`keyBetween(a,b)` は a<b の桁ごと中点を取り、隣接桁
  (gap 無し) では下位境界の上に新桁を挿入するため**常に挟める**。
- **prefix-stable 性が鍵**: `reindexFrac` は `keyBetween(null,…)` の連鎖でキーを採番する。
  この連鎖は**総数に依存せず先頭 N 個が不変**なので、add/del の splice がキーを再採番しなくても
  残った shape は正準キーを保ち、`JSON.stringify(state.shapes)` が undo/redo で厳密往復する
  (PBT 30 シナリオで担保)。
- **z 据え置きの安全策**: キーを持たない新規 shape が現れても `sortZ` は**既存キー順を崩さず**
  最上位キーの上に積む (旧 `nextZ()` 相当)。z fallback による全並べ替えはしない (フルソートが
  キー順と z 順の乖離で既存順序を壊すバグを実装中に検出・回避)。

### Step 2 実装メモ

- **op フォーマット**: `{op:'zorder', changes:[{id,before,after}]}`。`_zCommit(changes)` が
  `before!==after` の要素のみ残し記録 → **本当に動いた図形だけ**が履歴/sync に乗る。
- **4 操作の移動アルゴリズム** (いずれも entry で `sortZ()` してキー存在と整列を保証):
  - 前面 `doBringFront`: 選択を非選択の最大キーの上へ `keyBetween(p,null)` 連鎖 (相対順保持)。
  - 背面 `doSendBack`: 非選択の最小キーの下へ `keyBetween(prev,hi)` 連鎖。
  - 1つ前へ/後ろへ: ソート済み配列を端から走査し、選択を直近の非選択隣接の**間**へ 1 つだけ移動。
    複数選択は衝突しない向き (前へ=上から、後ろへ=下から) に処理。
- **逆操作**: `_apply` で `forward?after:before` を代入し `sortZ()`。動かなかった図形は不変なので
  `JSON.stringify(state.shapes)` の往復は Step 1 同様厳密 (PBT で担保)。
- **後方互換**: `_apply` は旧スナップショット形式 (`op.after`/`op.before`) も処理を残す。混在バージョン
  の peer や、Step 2 以前にメモリ上へ積まれた履歴に対する防御 (履歴は永続化されないので実害は限定的)。
- **既知の限界 → Step 3 で解消**: 2 peer が同時に並べ替えるとキーが衝突しうる (絶対キー代入のため)。
  これは Step 2 以前の全スナップショット方式でも同等の収束問題で、本 Step で悪化はしない。

### Step 3 実装メモ

- **タイブレーク = `shape.id`**: `sortZ` の比較を frac 単独から **`(frac, id)`** に変更。frac が一致した
  2 図形 (同一ギャップへの同時挿入) は、複製済みで globally-unique な `id` で**全ピア同一順序**に並ぶ。
  当初案の `key#peerId` 方式より単純 — peer 追跡も per-shape の追加フィールドも不要。
- **収束の根拠**: ある状態に到達した全ピアは同じ `{frac}` 集合を持つ (op はべき等・clock で dedup)。
  同 frac の図形は `id` で順序が一意に決まるため、ソート結果が一致する。単一ピア時は frac が distinct
  なのでタイブレークは発火せず、Step 1〜2 の挙動・PBT 往復は不変。
- **入力検証の強化**: `validRemotePayload('zorder')` は `changes` の各 `{id,before,after}` を型チェック
  (id は文字列必須、key は string か未指定)。不正 peer による非文字列キー注入で比較が壊れるのを防ぐ。
- **残課題**: interleaving (2 peer が同じ範囲に交互挿入すると順序が混ざる) は許容。厳密な意図順序が必要なら
  将来 op に origin 情報を足す余地はあるが、図形では実害が小さい (Figma/tldraw の判断と同じ)。

## 結論

fractional indexing (文字列 between-key) を採用し、`zorder` op を**動いた図形のみの最小デルタ**に
変更する。これは research 項目A (★最優先) と spec §13 の構造的解決であり、P2P sync 本番化の前提。
P0 可逆性・sync・永続化に触れるため**本 ADR 承認後に Step 1 から着手**する。
