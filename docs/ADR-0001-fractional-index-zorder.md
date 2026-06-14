# ADR-0001 — z 順序を fractional indexing に置き換える

- **状態**: Accepted — **Step 1 実装済** (2026-06-14)。Step 2〜4 は Proposed。
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
{op:'zorder', id, before:"<key>", after:"<key>"}            // 単一図形 (1 step / 1 keystroke)
{op:'zorder', changes:[{id,before,after},...]}              // 複数選択 (動いた図形のみ)
```

- `_apply(forward)` は `changes` の各 `{id}` に `forward?after:before` を代入し `sortZ()`。
- 逆操作は対称 (before/after を入れ替えるだけ)。**動いた図形のみ**を保持 → 履歴 O(変更数)。
- tie 問題は **キーが一意**であれば消える。生成時に衝突回避 (後述) すれば配列順 = キー順が一意に定まり、
  全順序スナップショットは不要になる。

### 配列順 vs キーの正準性

現状は配列順が描画の正準。移行後は **キーが正準**、配列はキー順にソートした派生 (`sortZ` を
キー比較に変更)。これにより「配列順を別途復元する」必要が消え、逆操作が単純化する。

## sync への影響

- per-shape キー更新は **可換性が高い**: 2 ピアが別図形を動かしても互いのキーを上書きしない。
- 同一図形・同一ギャップへの同時挿入で **キー衝突**しうる → 末尾に `peerId` を付与して決定的に
  タイブレーク (`key + '#' + peerId`)。既存の `versionNonce`/clock 方式 (research K) と整合。
- `validRemotePayload` に `zorder` の新ペイロード (文字列キー or changes 配列) の検証を追加。

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
2. **Step 2**: 4 つの z 操作を per-shape キー更新に書き換え、`zorder` op を最小デルタ化。
3. **Step 3**: sync の per-key 衝突タイブレーク + `validRemotePayload` 更新。
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

## 結論

fractional indexing (文字列 between-key) を採用し、`zorder` op を**動いた図形のみの最小デルタ**に
変更する。これは research 項目A (★最優先) と spec §13 の構造的解決であり、P2P sync 本番化の前提。
P0 可逆性・sync・永続化に触れるため**本 ADR 承認後に Step 1 から着手**する。
