# CLAUDE.md — Board

このファイルは Claude (および人間の協力者) が Board プロジェクトで迷わないための索引。

## WHY — 目的

既存のホワイトボードはサインアップ / 重量 / 有料 / プライバシーのいずれかを要求する。  
Board は 4 つ全部を否定する: **単一HTML、ゼロ登録、完全無料、E2E (共有リンクは実装済 ADR-0017 / 同期経路は未対応)**。

勝利条件: 「使い始めるのに 0 秒」「オフラインで等価に動く」「単一HTMLで小さく保つ」。  
破れたらプロダクト価値は消える。

> **サイズ予算について (2026-06-13 変更)**: かつて「gzip 44KB 未満」を厳格な不変条件として
> CI / test.mjs で強制していたが、予算の壁が実改善 (回転の全型対応・コネクタ実エッジ投影・
> a11y) の据え置きを繰り返し招いたため**撤去**した。サイズは依然として価値 (単一ファイル・
> 高速ロード) だが、ハードな上限ではなく**指針**として扱う。暴走防止に raw 512KB の緩い上限
> のみ残す。新機能は「小さく保つ」意識を持ちつつ、整合性・正しさを優先してよい。

## MAP — 構造

```
Board/
├── index.html             # 本体 (単一ファイル、~287KB raw / ~92KB gzip / ~76KB brotli)
│   ├── <style>            # デザイントークン + レイアウト + モーション
│   └── <script>
│       ├── CONSTANTS      # atomic config
│       ├── I18N           # ja / en
│       ├── STATE          # single source of truth
│       ├── GEOM           # pure geometry, hit test
│       ├── Store          # op-log, undo/redo (Command)
│       ├── Shape          # shape factories, translate
│       ├── RENDER         # RAF loop, drawShape, drawSelection
│       ├── INPUT          # pointer + keyboard + wheel
│       ├── tool handlers  # beginPen / beginRectLike / ...
│       ├── Persist        # IndexedDB
│       ├── UI             # DOM side-effects
│       ├── wire()         # event binding
│       ├── main()         # bootstrap
│       └── Service Worker # inline blob, offline cache
├── coverage.mjs           # index.html の未実行関数を列挙 (依存ゼロ / V8 カバレッジ)
├── README.md              # 公開用
├── CHANGELOG.md           # セマンティックバージョニング
├── CLAUDE.md              # この文書
├── LICENSE                # MIT
├── docs/
│   ├── architecture.md    # 詳細設計
│   ├── spec.md            # 仕様書 + 適合ギャップ追跡
│   ├── audit-2026-06.md   # カテゴリ別改善監査
│   ├── feature-triage-2026-07.md  # 機能過不足トリアージ (ソクラテス式問答。主要な負債はタッチ到達不能性)
│   ├── feature-backlog.md  # 上記の実行可能チケット化 (Opus/Sonnet が文脈なしで着手できる形式)
│   ├── instructions-opus-sonnet.md  # 文脈ゼロで着手する統合指示書 (長所短所改善+作業規律+モデル使い分け, v1.7.69)
│   ├── research-improvements.md  # 改善案調査
│   ├── ADR-0001-fractional-index-zorder.md  # z順序の分数インデックス化 (Step1-3実装済/Step4 見送り確定)
│   ├── ADR-0002-per-property-lww.md  # 並行編集の収束: プロパティ単位 LWW (upd/style 実装済)
│   ├── ADR-0003-connector-labels.md  # コネクタ(エッジ)ラベル — フロー図向け (実装済)
│   ├── ADR-0004-self-overwrite-protection.md  # 全消去/インポート直前のボードを自動バックアップ (実装済)
│   ├── ADR-0005-sketch-beautification.md  # ペンストロークの図形認識 (line/rect/ellipse, 幾何ヒューリスティック, 実装済)
│   ├── ADR-0006-touch-long-press.md  # タッチ long-press でコンテキストメニュー (FT-06, 実装済)
│   ├── ADR-0007-export-menu-import-picker.md  # エクスポートメニュー + .board ファイルピッカー (FT-07, 実装済)
│   ├── ADR-0008-share-modal-clarity.md  # Share モーダルの役割明示化 + コピーボタン (FT-05, 実装済)
│   ├── ADR-0009-id-index.md  # byId O(1)化 + グリッドキャッシュ無効化の一本化 (実装済)
│   ├── a11y-audit-2026-07.md  # a11y監査 (依存ゼロ静的検証、フォーカスリングのコントラスト不備を発見・修正)
│   ├── ADR-0010-peer-cursor-presence.md  # ピアカーソル表示 (spec.md P1「プレゼンス」、実装済)
│   ├── ADR-0011-peer-selection-highlight.md  # ピア選択ハイライト (FT-12、frame() 変化検出で送信、実装済)
│   ├── ADR-0012-theme-toggle.md  # テーマ手動トグル (FT-18、言語トグルは FT-18b に分離・見送り、実装済)
│   ├── ADR-0013-keyboard-label-edit.md  # Enter でラベル/テキスト再編集 (FT-19、_openLabelEditorFor共有、実装済)
│   ├── ADR-0014-language-toggle.md  # 言語手動トグル (FT-18b、LANG/T を let 化、実装済)
│   ├── ADR-0015-replicated-undo.md  # undo/redo を複製される op に (§F, arxiv 2404.11308, 実装済)
│   ├── ADR-0016-a11y-dom-mirror.md  # 盤面の画面外DOMミラー (§I / spec P1, WCAG 1.3.1, 実装済)
│   └── ADR-0017-share-link-e2e.md  # 共有リンクの E2E 暗号化 (FT-21, AES-GCM + fragment key, 実装済)
└── docs/ci-workflow.yml    # CI 定義 (v1.7.80)。**`.github/` には置けない — 実測で確認済み**:
    # この GitHub App は workflows 権限を持たず push が拒否される (2026-08-17 に実行して確認)。
    # .gitignore の長年の注記は**正しかった** — ただし「検証されていなかった」のも事実で、
    # v1.7.80 で実際に試して確定させた。有効化は人間が30秒で可能 (ファイル冒頭に手順)。
    # 検査は**一切再実装しない**: 不変条件は全て test.mjs にあり、CI の仕事は
    # 「忘れられない場所で走らせる」ことだけ。ここに検査を書くと真実の源が2つになる。
```

**重要な不変条件**:
- `index.html` は単一ファイル。外部 `<script src>` / `<link href>` を絶対に追加しない。
- サイズはハード上限なし (2026-06-13 に gzip 44KB 予算を撤去)。指針として小さく保つが、
  整合性・正しさを優先してよい。暴走防止に raw 512KB の緩い上限のみ `test.mjs` で残す。
- `state` は Store 経由でしか書き換えない (undo の完全性のため)。
- Render は副作用を最小化する: `state` を読むのみが原則。
  - 例外: `getImg()` は `_imgCache` (LRU) を書き換え + `img.onload` コールバックを登録する。
    これは意図的な設計（非同期イメージロード + キャッシュ）であり、`state` は変更しない。
  - 例外: `wrapTextCached()` は `_wrapCache` (shape → 折り返し結果, WeakMap) を書き換える。
    付箋テキストの毎フレーム再計算 (measureText) を避けるための純粋なメモ化キャッシュで、
    `state` は変更しない。shape オブジェクト参照は Store が in-place で mutate するため
    キー (text/maxWidth/fontSize) が変わらない限りキャッシュは有効なまま安全。
  - `drawShape()` に新たな副作用を追加する前に、この例外リストを更新すること。

## RULES — やっていいこと / ダメなこと

### やる
- op 追加時は必ず `_apply(op, false)` で逆操作できるか確認
- DOM を触るのは `UI.*` 内のみ
- 新機能追加前に `docs/ADR-NNNN-*.md` を書く
- WCAG AAA コントラストを維持 (`#0F172A` on `#FFF` = 18:1)
- ブランド色 `#00C4CC` に意味を統一 (選択・フォーカス・アクションのみ)

### やらない
- 外部 CDN (fonts, icons, libs) 追加
- `innerHTML =` で user input を流す (XSS)
- history に非可逆 op を push
- モーダル内に `animation` (reduce-motion の人向け)
- 「それっぽい AI」色 (紫グラデ、Inter、Space Grotesk)
- 量子・ブロックチェーン等の非現実機能

## WORKFLOWS — 進め方

### 機能追加
1. `docs/ADR-NNNN-*.md` を作成 (なぜ / 代替案 / 決定)
2. op 型を `Store._apply` に追加 (可逆性を担保)
3. tool handler を追加 (`beginX / contX / endX`)
4. `KEYMAP` と help grid を更新
5. `i18n` に対応する文字列を ja/en 両方で追加
6. README の Features を更新
7. CHANGELOG に記載

### バグ修正
1. 再現手順をまず書き出す
2. 最小修正。周辺をリファクタしない
3. `docs/architecture.md` に学びがあれば追記

### リリース
1. `CHANGELOG.md` 更新 (Keep a Changelog フォーマット)
2. `index.html` 冒頭と README の version バッジ更新
3. タグ `git tag v1.0.1 && git push --tags`
4. GitHub Releases にリリースノート + `index.html` 添付

### デバッグの優先順位 (Carmack 流)
1. Render に出ていない → State を疑う (console.log state.shapes)
2. 動作が重い → frame() 内の描画回数を疑う
3. Undo が壊れた → history の最新 op を疑う
4. 座標がズレる → DPR / zoom / viewport の順で疑う

## 100点への距離

Phase 1.0 = 70点 (MVP 完成、商用配布可能)

> **製品判断確定 (2026-07-01)**: `docs/research-improvements.md` §3.9「アーキテクチャは既に
> 投票を終えている」が問うた「scratchpad か workspace か」に対し、**scratchpad(速い・私的・
> 使い捨ての単独スケッチ)を選択**。Multi-page/複数ボード・スレッドコメント・identity 前提の
> コラボ機能は、この選択と構造的に衝突するため **100点の対象から除外**する(着手しない。
> 将来 workspace へ舵を切る場合は、この判断自体を明示的に覆す製品判断が改めて必要)。

**「残り30点」の配点表は削除した (v1.7.79 の要件監査)**。10/7/5/12/4/4 という点数は
誰も所有していない発明品で、既に半分が「対象外」と注記され、意思決定を何も駆動して
いなかった。マスクの第1段階(「要件には部署ではなく人名が付いていなければならない」)に
照らして落とす。代わりに**実際に残っているものだけ**を書く:

### 残っている作業(これだけ)

1. **FT-11 — 実機スクリーンリーダー確認**(NVDA / VoiceOver)。人間の手が要る。
   ADR-0016 が保証するのは「正しいマークアップが DOM に存在すること」までで、
   実際にどう読み上げられるかは別問題。**プロダクトの欠落ではなく検証の欠落**。
2. **FT-15 — 大きな画像で保存・共有が壊れないこと**。要件を手段(「dataURL を分離する」)
   ではなく目的で書き直した。**まだ実害を測っていない** — FT-13 の轍を踏まないよう、
   測ってから作るか決める。
3. **CI (自動化)** — 5段階アルゴリズムの最終段。守る不変条件は全て `node test.mjs` が
   既に実行しているので、1〜4 を終えてから。

### 対象外と確定しているもの(再検討には製品判断の明示的な覆しが要る)

- Multi-page / 複数ボード、identity 前提のコラボ、スレッドコメント
  — scratchpad という製品の正体と構造的に衝突 (§3.9)。
- quadtree / dirty-rect — **実測で不要と判明**(10,000 図形で 1ms 未満、
  かつ盤面サイズに比例しない)。`docs/feature-backlog.md` 末尾の要件監査を参照。
- axe-core による自動 a11y 監査 — 目的ではなく手段を指定した要件。目的は FT-11。
- i18n 1000言語 / Plugin API — MT インフラ・アーキテクチャ拡張を要し、scratchpad の
  射程外。

各 Phase は別 ADR + 独立リリース。一気に全部は作らない。
