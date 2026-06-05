# カテゴリー別 改善点調査 — 第2バッチ (arxiv + GitHub)

> `docs/category-research.md`(カテゴリー1〜10)の続き。Board のさらなる側面を 10 カテゴリー(11〜20)に分け、
> 各々 arxiv.org と GitHub から ~10 件を集めて改善点を洗い出す。制約は不変:
> **単一HTML / 依存ゼロ / オフライン等価 / gzip 44KB 予算**。
> 注: この環境では自動スケジューラ(ScheduleWakeup/Cron)が無いため、`/loop` の再実行ごとに ~2 カテゴリーずつ充填する。
> 開始: 2026-06-05。

## カテゴリー(11〜20)と進捗

11. ✅ テキスト & リッチテキスト編集(折返し・字形・Bidi)
12. ✅ 手書き文字認識 / OCR(ink → text)
13. ⬜ モバイル / タッチ / スタイラス入力(palm rejection・Pencil)
14. ⬜ プレゼン & ファシリテーション(タイマー・投票・follow)
15. ⬜ テンプレート / 図形ライブラリ / ステンシル
16. ⬜ 検索 & コマンドパレット & ナビゲーション
17. ⬜ 国際化(1000言語・MT・RTL・フォント)
18. ⬜ テスト / CI / 品質(property-based・fuzz・visual regression)
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

## 残り(13〜20)

`/loop` 再実行ごとに 2 カテゴリーずつ、上記書式で追記する。