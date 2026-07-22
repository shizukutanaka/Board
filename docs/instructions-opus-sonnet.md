# Board 指示書 — Opus / Sonnet 向け(文脈ゼロで着手できる形式)

最終更新: 2026-07-14 / 対象バージョン: **v1.7.70**(`node test.mjs` → **1632 pass / 0 fail**)

このファイルは、**このリポジトリを初めて見る Opus / Sonnet セッションが、追加の文脈なしに
安全かつ正しく作業を始められる**ことだけを目的とする。`CLAUDE.md`(索引)・`docs/spec.md`
(仕様+ギャップ)・`docs/feature-backlog.md`(チケット)・`docs/ADR-*.md`(決定記録)を
束ねた実行用サマリ。矛盾があれば **`CLAUDE.md` と各 ADR が正**。

---

## 0. まず読む3行

1. Board は **単一 `index.html`**(外部依存ゼロ・登録不要・完全オフライン)のホワイトボード。
   `<script>` 1本に全実装が入る。**外部 `<script src>` / `<link href>` を絶対に追加しない。**
2. 全ての状態変更は **`Store._apply(op, forward)`(可逆 op-log)** を通す。`draw()` は state を
   **読むだけ**(例外は `getImg`/`wrapTextCached` のメモ化のみ)。
3. 変更したら必ず **`node test.mjs` を green にし、非空虚性(stash して新テストが fail する)を
   確認**してからコミット。CI 相当ゲート(構文・innerHTML 禁止・外部リソース禁止・512KB 上限)も通す。

---

## 1. 長所(= 壊してはならない不変条件)

| 長所 | 具体的な守り方 |
|---|---|
| **ゼロ摩擦(単一HTML・オフライン等価)** | 外部リソース追加禁止。SW はインライン blob。サイズは指針(暴走防止 raw 512KB のみ強制、gzip 予算は 2026-06-13 撤去済み) |
| **可逆 op-log の一貫性** | 新 op は必ず `_apply(op,false)` で逆操作可能に。undo/redo・sync・永続化は同一経路 |
| **CRDT 収束(ADR-0002 プロパティ単位 LWW / ADR-0001 分数 z 順序)** | `_stampWrites` で書き込みクロックを記録した op は、**逆適用(undo)時も `_lwwSkip` でリモートの新しい書き込みを保護**(v1.7.68 で全 op 型に統一)。2ピア収束ハーネスで担保 |
| **防御的 intake(単一ゲート)** | `.board`/URL ハッシュ/IDB/remote sync は**すべて `validShape`/`validPatch` を通る**。新フィールドの検証はこの1箇所に足す。画像 `dataUrl` は `data:image/` のみ許可(v1.7.69、外部 URL 注入=トラッキングピクセル防止) |
| **a11y の積み上げ** | WCAG AAA コントラスト、キーボード完結、`aria-label`/`title` はロケール追従(v1.7.63)、SR 専用 live region(`UI.announce`) |
| **表示=出力パリティ** | canvas と `buildSVG` は同じ図形定義を描く。**片方を変えたら必ず両方**(v1.7.68 でフレームのラベル/不透明度・単点ペン半径の乖離を修正した実績あり) |
| **HiDPI 描画規約(v1.7.62)** | `draw()` のオーバーレイパスは CSS px で描き、DPR はトランスフォームが供給。**`G.w2s` の出力に `*DPR` を手で掛けない**(二重適用バグの温床) |

---

## 2. 製品方針のガードレール(着手前に必読)

`CLAUDE.md`(2026-07-01 確定)より。Board は **「速い・私的・使い捨ての単独スケッチ
(scratchpad)」** を選択済み。以下は**この判断を明示的に覆さない限り着手しない**:

- ❌ **多ページ / 複数ボード**(scratchpad の正体と構造的に衝突)
- ❌ **identity 前提のコラボ**(ワークスペース化、`docs/research-improvements.md` §3.8/3.9)
- ❌ **サーバー追加**(単一HTML・サーバーレスは明文化された製品判断)
- ❌ 「それっぽい AI」色(紫グラデ/Inter/Space Grotesk)、量子・ブロックチェーン等の非現実機能

> spec.md §14.3 のロードマップに「多ページ P2」が残っているが、これは scratchpad 判断より
> 前の記述で、**現方針では対象外**。着手しないこと(この矛盾自体、次に spec.md を触る際に
> 解消するとよい)。

---

## 3. 短所と改善チケット(優先度・ブロック状況つき)

### 3A. コードで前進できる(=あなたが今やれる)

| ID | 内容 | 優先 | 着手条件 |
|---|---|---|---|
| **新規バグ探索** | 未監査領域(pointer/gesture 状態機械・persistence 後方互換・geometry/hit-test)を1つ選び、**実バグを1つ見つけて test つきで直す**。直近の deep-audit(v1.7.68)+ post-audit(v1.7.69 の dataUrl 脆弱性)がこの型。空虚な変更は禁止 | P1〜P2 | なし。**最も推奨** |
| **P1 DOM ミラー a11y** | 図形ごとの off-screen DOM ノードで SR ネイティブ対応 | P1 | **大型 ADR を先に書く**。README のアクセシビリティ節の「canvas 内容は SR から不可視」制約を解消する将来拡張 |
| インポート拡張 | `.excalidraw` / SVG / Markdown 取込 | P2 | 段階実装。intake は必ず `validShape` ゲートを通す |
| テストの偏り解消 | レンダリング実体・ポインタ操作列の behavioral 検証を厚く | P3 | v1.7.62 の記録キャンバス(`_setCtx` + 変換追跡)を再利用できる |

### 3B. ブロック中(コードでは解決不能 — 記録のみ / 条件待ち)

| ID | 内容 | ブロック理由 |
|---|---|---|
| **FT-09** | `.github/workflows/ci.yml` のコミット | ファイルは作成済み。`.gitignore` が `.github/` を除外。**workflows スコープを持つ人間**が `git add -f` する必要 |
| **FT-10** | axe-core による本格 a11y 監査 | **npm install のユーザー明示許可**待ち(依存ゼロの静的コントラスト検証は実施済み) |
| **FT-11** | 実スクリーンリーダー(NVDA/VoiceOver)確認 | **実機**が要る。この環境では不可 |
| **FT-13** | dirty-rect 差分再描画 | `draw()` 核心の再設計。**実ブラウザでの視覚回帰検証手段**が無いと「動いて見えて壊れている」を検出できない |
| **FT-15** | 画像 dataURL の参照分離(CAS / OPFS 候補) | 永続化フォーマット変更=後方互換が最重要リスク。**要 ADR**。分離先は IndexedDB 別 store と **OPFS**(大 blob 書込が高速)を比較 |
| **FT-20** | WebRTC 接続失敗時のユーザーフィードバック | `onconnectionstatechange` 未配線。**実ブラウザの RTC 状態機械**でしか「二重/欠落トースト」を検証できない(fake-DOM は `RTCPeerConnection` を undefined スタブ)。盲目実装で回帰を入れない |

> **重要**: FT-13/FT-15/FT-20 のような「実ブラウザ検証が前提」の項目を、検証手段なしで
> 盲目実装しないこと。1632 pass の成熟コードに検証不能な回帰を持ち込むより、backlog 記録に
> 留める方が正しい(v1.7.68 で FT-13、v1.7.69 で FT-20 をこう扱った実績)。

---

## 4. 作業の型(この順で必ず回す)

### 機能追加
1. `docs/ADR-NNNN-*.md` を書く(なぜ / 代替案 / 決定 / 影響 / テスト方針)。**現在の最新は ADR-0014**、次は ADR-0015。
2. op 型を `Store._apply` に追加(`_apply(op,false)` で可逆を担保)
3. tool handler(`beginX/contX/endX`)、`KEYMAP`・help grid、`i18n`(ja/en **両方**)を追加
4. README Features・CHANGELOG に記載
5. **i18n は ja/en のキーセット完全一致**(test.mjs に恒久検査あり。片方だけ足すと即 fail)

### バグ修正
1. 再現手順を書き出す → 最小修正(周辺リファクタ禁止)
2. **`_apply`/intake ゲート等の単一チョークポイントで直す**(v1.7.68 の `_lwwSkip`、v1.7.69 の `validPatch` が好例)
3. `docs/architecture.md` に学びがあれば追記

### テスト規律(必須)
- `test.mjs`: 上部の `checks` 配列(presence)+ 大きな try ブロック(behavioral、`assert`)。
  behavioral は末尾の **1本の `pass += N` 行**を手で更新する(自動カウントされない — 頻出の罠)。
- **非空虚性**: `git stash push -- index.html` → `node test.mjs` で新テストが fail することを確認 →
  `git stash pop`。fail しないテストは無価値。
- CI 相当ゲート: `<script>` 抽出 → `node --check`、`grep innerHTML=`、`grep 外部リソース`、raw 512KB。

### コミット/リリース
- `const V='X.Y.Z'`(index.html 冒頭コメントも)・README バッジ・CHANGELOG を同期更新。
- 指定ブランチ `claude/deepresearch-ultrathink-improvement-RTm6z` に `git push -u origin`。
  ネットワーク失敗のみ 2s/4s/8s/16s の指数バックオフでリトライ。**PR は明示依頼が無い限り作らない。**
- ⚠️ **タグ push はこのセッション権限では 403**。正式 GitHub Release の作成は
  **リポジトリオーナーの手作業**(Issue #1 に手順を staged 済み)。

---

## 5. モデル使い分け(このプロジェクトでの経験則)

| モデル | 向く作業 |
|---|---|
| **Opus** | 設計判断を伴う機能(ADR 起草)、多次元 deep-audit の統括、微妙な CRDT/undo バグの根本原因特定、セキュリティ観点のレビュー |
| **Sonnet** | 明確化されたチケットの実装、テスト追加、i18n/aria の機械的展開、リファクタ、ドキュメント同期 |
| **Haiku** | 単純な grep・状態確認・定型の CI ゲート実行 |

deep-audit は「8観測軸を並列エージェントで走査 → 各所見を3票制の敵対的検証」が有効
(v1.7.68 で 13候補 → 9確認 → 全修正、うち1件は remotely-exploitable な undo-clobber)。
Ultracode が ON のセッションでのみ Workflow ツールで実施可。

---

## 6. 現在地(2026-07-14, v1.7.70)

- **直近の到達点**: HiDPI 描画修正・ピアプレゼンス(ADR-0010/0011)・テーマ/言語トグル
  (ADR-0012/0014)・Enter でラベル編集(ADR-0013)・空盤面ヒント・deep-audit 9件・
  dataUrl 外部 URL 遮断(v1.7.69 セキュリティ)・回転ボックスの当たり判定漏れ修正
  (v1.7.70、既存 UI バグ)。全て default ブランチに push 済み。
- **残タスクの実態**: §3A(コードで前進可)を1つ選んで着手するのが最も価値が高い。
  §3B は人間/実機/npm 許可/ADR 待ちで、盲目実装しない。
- **公開状態**: 完成品は GitHub 既定ブランチで clone/1クリックDL 可能。正式 Release オブジェクトの
  作成のみオーナー手作業として残る(Issue #1)。
