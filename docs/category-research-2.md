# カテゴリー別 改善点調査 — 第2バッチ (arxiv + GitHub)

> `docs/category-research.md`(カテゴリー1〜10)の続き。Board のさらなる側面を 10 カテゴリー(11〜20)に分け、
> 各々 arxiv.org と GitHub から ~10 件を集めて改善点を洗い出す。制約は不変:
> **単一HTML / 依存ゼロ / オフライン等価 / gzip 44KB 予算**。
> 注: この環境では自動スケジューラ(ScheduleWakeup/Cron)が無いため、`/loop` の再実行ごとに ~2 カテゴリーずつ充填する。
> 開始: 2026-06-05。

## カテゴリー(11〜20)と進捗

11. ✅ テキスト & リッチテキスト編集(折返し・字形・Bidi)
12. ✅ 手書き文字認識 / OCR(ink → text)
13. ✅ モバイル / タッチ / スタイラス入力(palm rejection・Pencil)
14. ✅ プレゼン & ファシリテーション(タイマー・投票・follow)
15. ✅ テンプレート / 図形ライブラリ / ステンシル
16. ✅ 検索 & コマンドパレット & ナビゲーション
17. ✅ 国際化(1000言語・MT・RTL・フォント)
18. ✅ テスト / CI / 品質(property-based・fuzz・visual regression)
19. ⬜ 埋め込み & メディア(iframe/動画/web embed)
20. ⬜ AI 生成アシスト(text-to-diagram・LLM copilot・BYOK)

---

## 11. テキスト & リッチテキスト編集 ✅

### 収集情報(arxiv / GitHub)
- [GitHub: Hufe921/canvas-editor](https://github.com/Hufe921/canvas-editor) — Canvas/SVG ベースのリッチテキストエディタ。**レンダリングパイプラインを完全制御**し、ブラウザ間で一貫したタイポ/ページネーション/エクスポート。
- [GitHub: danielearwicker/carota](https://github.com/danielearwicker/carota) — HTML Canvas 上のリッチテキスト描画/編集(キャレット・選択・折返し)。
- [GitHub: WICG/canvas-formatted-text](https://github.com/WICG/canvas-formatted-text) — canvas に書式付きテキストを描く標準提案(将来の API)。
- [GitHub: chenglou/pretext](https://github.com/chenglou/pretext) — **高速なテキスト計測 & レイアウト**(正規化・segment・glue 規則を一度だけ計算)。
- [GitHub: lavrton/textik](https://github.com/lavrton/textik) / [markusmoenig/richtextjs](https://github.com/markusmoenig/richtextjs) / [joshmarinacci/js-richtext](https://github.com/joshmarinacci/js-richtext) — canvas リッチテキスト各実装。
- [GitHub: grassator/canvas-text-editor-tutorial](https://github.com/grassator/canvas-text-editor-tutorial) — canvas のキャレット/編集の基礎。
- [GitHub: whatwg/html #10677](https://github.com/whatwg/html/issues/10677) — 編集向け Canvas TextMetrics 拡張の議論。
- [arxiv 2507.06460 — Ragged Blocks: Rendering Structured Text with Style](https://arxiv.org/html/2507.06460v2) — 構造化テキストのスタイル付き描画。
- 技術一般: **Knuth–Plass** 行分割(両端揃え)、Unicode break opportunity、grapheme cluster、Bidi 並べ替え、shaping(glyph 変換・font feature)。

### Board への改善点
- **P1: 自動折返し** — 現状 text/sticky は `split('\n')` のみで幅折返し無し。**Unicode break opportunity による word-wrap**(最低限)、両端揃えは Knuth–Plass(2507.06460)。sticky 内テキストの可読性が向上。
- **P2: リッチテキスト**(太字/斜体/箇条書き/リンク)— carota/canvas-editor 流の軽量実装で競合パリティ(FigJam/Excalidraw も限定的)。
- **P2: キャレット hit-test & 計測の高速化** — pretext 流に segment/glue を一度計算、キャレットは二分探索。
- **P2: Bidi/RTL + emoji/grapheme** — `fillText` は基本のみ。RTL 並べ替えと結合文字対応(カテゴリー17 i18n と連動)。
- **設計判断**: 編集は既存の DOM textarea オーバーレイ、描画は canvas。重いエディタ lib は入れない。

---

## 12. 手書き文字認識 / OCR(ink → text)✅

### 収集情報(arxiv / GitHub)
- [GitHub: naptha/tesseract.js](https://github.com/naptha/tesseract.js/) — 100+ 言語の **WASM OCR**。インポート画像→テキスト抽出。
- [GitHub: robertknight/tesseract-wasm](https://github.com/robertknight/tesseract-wasm) — Tesseract の WASM 版(英語データ込み ~2.1MB brotli、WASM SIMD)。
- [GitHub: antimatter15/ocrad.js](https://github.com/antimatter15/ocrad.js/) — Emscripten 製の軽量 OCR。**端末/OS 非依存の手書き入力**にも。
- [GitHub: codegallery-me/Handwritten-Text-Recognition](https://github.com/codegallery-me/Handwritten-Text-Recognition) — 手書き認識 Web アプリ例。
- [GitHub: bdstar/Handwritten-Text-Recognition-Tesseract-OCR](https://github.com/bdstar/Handwritten-Text-Recognition-Tesseract-OCR) — CRNN + CTC(TensorFlow/Keras/IAM)。
- [arxiv 2506.20255 — Transformer HWR Jointly Using Online & Offline Features](https://arxiv.org/abs/2506.20255) — オンライン(x,y,pen)とオフライン画像を**共有潜在空間で early fusion**、IAMOn-DB で SOTA。軽量 transformer。
- [arxiv 2305.03407 — Online Gesture Recognition using Transformer & NLP](https://arxiv.org/pdf/2305.03407) — ストロークの transformer 認識。
- [arxiv 2211.02643 — Transformer for Online Recognition of Mathematical Expressions](https://arxiv.org/pdf/2211.02643) — **数式の手書き認識**(STEM 用途)。
- [arxiv 2509.23624 — DiffInk: Latent Diffusion for Text→Online Handwriting Generation](https://arxiv.org/html/2509.23624) — 手書き生成(逆方向の参考)。

### Board への改善点
- **P1(opt-in): ink→text** — ペンストローク列(x,y,pressure)を軽量 transformer で文字化(2506.20255)。**WASM/モデル(~MB)は本体に同梱せず遅延ロード / BYOK**(単一HTML・オフライン原則を維持)。roadmap v1.4 と整合。
- **P2: 画像 OCR** — ペーストしたスクショから文字抽出(tesseract.js)。opt-in。
- **P2: 数式認識**(2211.02643)— STEM ホワイトボード用途。
- **統合**: カテゴリー4(図形認識)と束ねて「ink understanding」パイプライン(図形 or 文字 or 数式を判定)に。
- **設計判断**: 重い依存は **オプトインの外部ロード**のみ。既定は完全オフラインの単一HTML。

---

## 13. モバイル / タッチ / スタイラス入力 ✅

### 収集情報(arxiv / GitHub)
- [GitHub: shuding/apple-pencil-safari-api-test](https://github.com/shuding/apple-pencil-safari-api-test) — Safari の **force touch + リアルタイム Bezier** スケッチ。Pencil API の実例。
- [GitHub: PCrompton/ApplePencilExperiments](https://github.com/PCrompton/ApplePencilExperiments) — TouchCanvas 流の **coalesced/predictive touches**、azimuth/altitude 利用。
- [GitHub: mdn/content — Using Pointer Events](https://github.com/mdn/content/blob/main/files/en-us/web/api/pointer_events/using_pointer_events/index.md) — pointer 非依存入力、coalesced events の基礎。
- [GitHub: bigbluebutton PR #11224](https://github.com/bigbluebutton/bigbluebutton/pull/11224) — アクティブペン使用中の **誤描画を防止**(palm rejection)。
- [GitHub: logseq #9863](https://github.com/logseq/logseq/issues/9863) — タッチ端末の palm rejection 要望。
- [GitHub: fabricjs #3946](https://github.com/fabricjs/fabric.js/issues/3946) — iPad Pencil が canvas 外タップで線を引く不具合。
- [GitHub: pixijs #8037](https://github.com/pixijs/pixijs/issues/8037) — Apple Pencil が pointerdown/up を二重発火。
- [GitHub: excalidraw discussion #9215](https://github.com/excalidraw/excalidraw/discussions/9215) — **入力を Apple Pencil に限定**するペンオプション。
- [arxiv/特許: Probabilistic palm rejection using spatiotemporal touch features](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10031619) — 時空間特徴 + 反復分類で確率的に手のひらを棄却。
- 技術一般: pen 在席中は touch 描画を無効化、接触面積/形状で palm 判定。

### Board への改善点
- **P1: `getCoalescedEvents()` 採用** — pointermove でサブフレームの全点を取得し、120Hz ペンでも滑らかに(現状は 1 move=1 点の可能性)。`getPredictedEvents()` で知覚遅延も低減(カテゴリー3 と連動)。
- **P1: pen-only モード(palm rejection)** — `pointerType` で pen/touch/mouse を判別。ペン描画中は finger touch を描画に使わず **パン/ズーム** に回す(Excalidraw #9215 流)。
- **P2: 筆圧/傾き** — `pressure`/`tiltX,tiltY`/`altitudeAngle,azimuthAngle` を可変幅・回転ブラシに反映。
- **P2: Pencil 二重イベント対策** — 同座標 pointerdown/up の dedup(pixijs #8037)。canvas 外開始の誤描画ガード(fabric #3946)。
- **設計判断**: すべて標準 Pointer Events で実装(依存ゼロ)。

---

## 14. プレゼン & ファシリテーション ✅

### 収集情報(arxiv / GitHub)
- [GitHub: microsoft/live-share-sdk](https://github.com/microsoft/live-share-sdk) — **同期ペン/レーザーポインタ/カーソル**(LiveCanvas が InkingManager のストロークとリモートカーソルを同期)。follow の手本。
- [GitHub: AstraDraw/astradraw](https://github.com/AstraDraw/astradraw) — frames-as-slides の **プレゼンモード + レーザーポインタ**、presence/カーソル、スレッドコメント、動画ウォークスルー(PiP)。Board の上位像。
- [GitHub: bigbluebutton #24555](https://github.com/bigbluebutton/bigbluebutton/issues/24555) — 発表者カーソルを赤い「レーザー」点として全員に表示。
- [GitHub: excalidraw #9356](https://github.com/excalidraw/excalidraw/issues/9356) — プレゼン中のハイパーリンククリック。
- [GitHub: microsoft/PowerToys #16703](https://github.com/microsoft/PowerToys/issues/16703) — レーザーポインタ/スポットライトのユーティリティ。
- [arxiv 2302.07909 — MAGIC: Manipulating Avatars and Gestures for Remote Collaboration](https://arxiv.org/abs/2302.07909) — deixis(指示)の復元で相互理解向上。
- [arxiv 2406.05209 — SPARC: Shared Perspective for Remote Collaboration](https://arxiv.org/abs/2406.05209) — 視点共有。
- [arxiv 1001.3150 — Gaze and Gestures in Telepresence](https://arxiv.org/pdf/1001.3150) — gaze/deixis と workspace awareness、common ground。
- 知見: 生産的協調には **workspace awareness** と deictic(「ここ」「これ」)が要。

### Board への改善点
- **P1: レーザーポインタ** — プレゼン中、消えるトレイル付きの指示点を既存 sync でブロードキャスト(発表者→視聴者)。プレゼンの定番。
- **P1: follow / 視点追従** — 発表者の viewport を視聴者に追従させる(live-share LiveCanvas 流)。
- **P2: ライブカーソル + 名前** — 既存 peer avatar に加え、協調中のカーソル位置を表示(deixis を支える、arxiv awareness 研究)。
- **P2: エフェメラルな指示マーカー(reactions/point-here)** — 一時的な「ここ」マーカーを共有(common ground)。
- **P2: スレッドコメント**(roadmap v1.3)+ 発表者タイマー/ノート(facilitation)、プレゼン中リンククリック(excalidraw #9356)。
- **awareness**: 各 peer の viewport 矩形を薄く表示(MAGIC/SPARC の視点共有を 2D で簡易化)。
- **設計判断**: 一時的(ephemeral)情報は undo 履歴に入れず、op-log と別チャネルで同期。

---

## 15. テンプレート / 図形ライブラリ / ステンシル ✅

### 収集情報(arxiv / GitHub)
- [GitHub: excalidraw/excalidraw-libraries](https://github.com/excalidraw/excalidraw-libraries) — 公開ライブラリ集(`.excalidrawlib` JSON)。UX/ワイヤフレーム、数学記号、IT アーキ、調整可能な矢印など**カテゴリ別の再利用部品**。
- [GitHub: vadimdemedes/excalidraw-ui](https://github.com/vadimdemedes/excalidraw-ui) — 再利用可能な UI 要素群。
- [GitHub: jorgedlcruz/excalidraw-library](https://github.com/jorgedlcruz/excalidraw-library) / [thgvinni/excalidrawLib](https://github.com/thgvinni/excalidrawLib) — アイコンライブラリ。
- [GitHub: ExcaliMath discussion #11110](https://github.com/excalidraw/excalidraw/discussions/11110) — **80+ STEM 図形**(幾何/代数/統計/物理/生物/化学)+ LaTeX/関数グラフ。
- [GitHub: excalidraw #1091](https://github.com/excalidraw/excalidraw/issues/1091) — Assets/Component Library 機能要望。
- [GitHub: zsviczian/obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) — テンプレ/ライブラリ運用の実例。
- [arxiv/特許: Parametric Shape Grammar Interpreter](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7415156) — 形状をサブ形状へ分解し**パラメトリックに再構成**。
- [arxiv 2603.22386 — From Static Templates to Dynamic Runtime Graphs](https://arxiv.org/pdf/2603.22386) — 静的テンプレ→動的構成。
- [arxiv 1904.02222 — Architectures in Parametric Component-Based Systems](https://arxiv.org/pdf/1904.02222) — インスタンス数をパラメータ化する部品系。

### Board への改善点
- **P1: 図形ライブラリ(`.boardlib` JSON)** — 既存の group を「再利用部品」として保存/挿入。`.excalidrawlib` 流のオープン JSON、パネルから挿入、URL/ファイルから opt-in import。Board は group 機構があるので低コスト。
- **P1: スターターテンプレート** — kanban / フローチャート / レトロ / マインドマップを埋め込み JSON で同梱(数 KB)。「0 秒で使い始める」を強化。
- **P2: シンボル(master+instance)** — マスタ編集が全インスタンスに伝播(Figma コンポーネント風)。パラメトリック上書き。
- **P2: 調整可能図形(parametric)** — shape grammar 的にパラメータで可変(矢印頭/角丸等。excalidraw の adjustable arrow)。
- **設計判断**: ライブラリは**コードでなくデータ(JSON)** → state に読み込むだけで単一HTML/依存ゼロに収まる。

---

## 16. 検索 & コマンドパレット & ナビゲーション ✅

### 収集情報(arxiv / GitHub)
- [GitHub: Nozbe/microfuzz](https://github.com/Nozbe/microfuzz) — **2KB・依存ゼロ・フレームワーク非依存**の fuzzy search。数千件をミリ秒で。**そのまま移植候補**。
- [GitHub: timc1/kbar](https://github.com/timc1/kbar) — cmd+k インターフェース(キーボードナビ + ショートカット登録)。設計参考。
- [GitHub: pacocoursey/cmdk](https://github.com/pacocoursey/cmdk) — 高速・unstyled コマンドメニュー(カスタム filter/ranking、aria 配慮)。
- [GitHub: albingroen/react-cmdk](https://github.com/albingroen/react-cmdk) / [asabaylus/react-command-palette](https://github.com/asabaylus/react-command-palette) — コマンドパレット実装(fuzzysort 連携)。
- [GitHub: stefanjudis/awesome-command-palette](https://github.com/stefanjudis/awesome-command-palette) — 実装集。
- [arxiv 1701.08688 — Approximate String Matching: Theory and Applications](https://arxiv.org/abs/1701.08688) — 近似文字列照合の体系。
- [arxiv 2211.02767 — Fuzzy Substring Matching: On-device Fuzzy Search at Snapchat](https://arxiv.org/pdf/2211.02767) — **skip-bigram 検索 + 局所 Levenshtein ランキング**(オンデバイス志向、Board の検索に最適)。
- [arxiv 1310.1440 — Approximate String Matching using a Bidirectional Index](https://arxiv.org/pdf/1310.1440) — 双方向索引。
- 技術一般: Levenshtein / Jaro / token-sort、Aho-Corasick / KMP / Boyer-Moore。

### Board への改善点
- **P1: コマンドパレット(Cmd/Ctrl+K)** — 全アクション/ツール/ショートカットを fuzzy 検索して実行。発見性が大幅向上。microfuzz(~2KB)移植 or 部分列スコアラ自前(~50行)で**依存ゼロ**。
- **P1: 図形/テキスト検索** — text/sticky 内の文字を検索→該当へジャンプ&ハイライト。オンデバイス fuzzy(skip-bigram, 2211.02767)。
- **P2: クイックナビ** — frame/名前付き shape へ「go to」(既存の frame + minimap と統合)。
- **P2: キーボードファースト** — a11y(カテゴリー6)と既存 KEYMAP に整合。
- **設計判断**: 純 JS の部分列/Levenshtein スコアラをインライン(~50行)、外部依存なし。

---

## 17. 国際化(1000言語・MT・RTL・フォント)✅

### 収集情報(arxiv / GitHub)
- [GitHub: wikimedia/jquery.i18n](https://github.com/wikimedia/jquery.i18n) / [wikimedia/banana-i18n](https://github.com/wikimedia/banana-i18n) — 複数形/性/**`{{bidi:…}}` による Bidi 破損回避**、magic words。実運用の堅牢な i18n。
- [GitHub: fnando/i18n-js](https://github.com/fnando/i18n-js) / [fnando/i18n](https://github.com/fnando/i18n) — 軽量 JS i18n。
- [GitHub: codingcommons/typesafe-i18n](https://github.com/codingcommons/typesafe-i18n) — 型安全・軽量(~300B 実装も)。
- [GitHub: i18n-pro/core](https://github.com/i18n-pro/core) — 軽量・自動翻訳の i18n。
- [GitHub: oh-jon-paul/awesome-i18n](https://github.com/oh-jon-paul/awesome-i18n) — i18n リソース集。
- [arxiv 2401.16582 — Massively Multilingual Text Translation for Low-Resource Languages](https://arxiv.org/abs/2401.16582) — 多言語転移で低資源言語を底上げ。
- [arxiv 2210.11621 — SMaLL-100: Shallow Multilingual MT for Low-Resource](https://arxiv.org/pdf/2210.11621) — 12 層エンコーダ/3 層デコーダの**浅い軽量 MT**。
- [arxiv 2503.24102 — Is LLM the Silver Bullet to Low-Resource MT?](https://arxiv.org/html/2503.24102v1) — LLM 翻訳の限界。
- [arxiv 2410.03215 — Low-Resource MT for WMT24 Indic](https://arxiv.org/pdf/2410.03215) — 低資源言語の実務。
- 技術一般: 動的フォントサブセット化(必要グリフのみ)。

### Board への改善点
- **P1: i18n インフラ強化** — 現状 `I18N` は ja/en のみ。複数形・**Bidi 安全な補間**(banana-i18n の `{{bidi:}}` 流)を導入。
- **P1: RTL / Bidi** — RTL ロケールで UI ミラーリング、canvas テキストの Bidi 並べ替え(カテゴリー11 と連動)。アラビア/ヘブライ対応。
- **P2: 1000言語(roadmap v1.4)** — 全言語文字列を単一HTMLに同梱すると肥大化 → **ロケール JSON をオンデマンドロード**(opt-in、ja/en は内蔵)。コミュニティ翻訳(Crowdin 風)。
- **P2: MT は opt-in/BYOK** — 浅い MT(SMaLL-100)でもモデルは大 → 本体に同梱せず任意ロード。
- **フォント**: CJK/アラビアフォントは巨大で同梱不可 → OS フォント前提(現 ui-font スタック維持)。SVG/PDF 出力時も system font に委ねる。
- **設計判断**: 「使い始め 0 秒/単一HTML」を守るため、追加言語・MT・フォントは**外部リソースの opt-in ロード**に限る。

---

## 18. テスト / CI / 品質(property-based・fuzz・visual regression)✅

### 収集情報(arxiv / GitHub)
- [GitHub: dubzzz/fast-check](https://github.com/dubzzz/fast-check) — JS の **property-based testing**(QuickCheck 風)。op-log の可逆性不変条件の検証に最適。
- [GitHub: satelllte/playwright-canvas](https://github.com/satelllte/playwright-canvas) — Playwright で **canvas シナリオ**を E2E(Clock API + 視覚比較)。
- [GitHub: asgaardlab/canvas-visual-bugs-testbed](https://github.com/asgaardlab/canvas-visual-bugs-testbed) — canvas/PixiJS の**視覚回帰テスト**フレームワーク。
- [GitHub: microsoft/playwright #8161](https://github.com/microsoft/playwright/issues/8161) — visual regression(`toMatchSnapshot`)。
- [GitHub: vitest #2212](https://github.com/vitest-dev/vitest/discussions/2212) — PBT/fuzzing のネイティブ対応議論。
- [arxiv 2211.12003 — Application of PBT Tools for Metamorphic Testing](https://arxiv.org/abs/2211.12003) — PBT ⊃ metamorphic、**round-trip/不変条件**を MR として形式化。
- [arxiv 2510.09907 — Agentic Property-Based Testing](https://arxiv.org/html/2510.09907v1) — エコシステム横断のバグ発見。
- [arxiv 2112.10328 — Deriving Semantics-Aware Fuzzers from Web API Schemas](https://arxiv.org/pdf/2112.10328) — スキーマ駆動の意味的ファザー。
- [arxiv 2208.09505 — Metamorphic Testing for Web System Security](https://arxiv.org/pdf/2208.09505) — セキュリティの MR。

### Board への改善点
- **P1: op-log の property-based テスト** — fast-check で**ランダムな op 列**を生成し、metamorphic relation を検証:「全 op 適用→全 undo = 初期状態」「redo = undo 前」。Board の中核不変条件(可逆性)を網羅的に検証し、レビューで見つけた zorder 級バグを未然に捕捉。**dev 依存のみ**(index.html は依存ゼロのまま)。
- **P1: 視覚回帰テスト** — ヘッドレスで canvas を描画→PNG スナップショット比較(playwright-canvas / asgaardlab testbed)。描画リグレッションを検出。
- **P2: 受信 op のファジング** — 不正 op を生成し `applyRemote` が状態を壊さないことを検証(検証強化の指摘と接続)。
- **P2: メタモルフィック関係** — translate(d)→translate(-d)=恒等、group→ungroup=恒等、SVG export→import ラウンドトリップ。
- **設計判断**: テスト基盤は **dev 専用**(fast-check/Playwright は devDependency)。本体 index.html の単一HTML/依存ゼロは不変。既存 fake-DOM ハーネスに fast-check を統合可能。

---

## 残り(19〜20)

`/loop` 再実行ごとに 2 カテゴリーずつ、上記書式で追記する。