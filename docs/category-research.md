# カテゴリー別 改善点調査 (arxiv + GitHub)

> Board(単一HTML / offline-first 無限ホワイトボード)を 10 カテゴリーに分類し、各カテゴリーごとに
> arxiv.org と GitHub から関連情報を ~10 件集め、改善点を洗い出す。`/loop` で反復実行し、各回 ~2 カテゴリーを埋める。
> 制約は常に **単一HTML / 依存ゼロ / オフライン等価 / サイズ予算(gzip 44KB)**。総括的な優先度は
> `docs/research-improvements.md` を参照。調査開始: 2026-06-05。

## 10 カテゴリーと進捗

1. ✅ 無限キャンバス & 描画パフォーマンス
2. ✅ リアルタイム協調 & CRDT 同期
3. ✅ フリーハンド作画 / ストローク表現(筆圧・平滑化)
4. ✅ スケッチ/図形認識 & beautification
5. ⬜ local-first 永続化 / PWA / ストレージ
6. ⬜ アクセシビリティ(canvas a11y / キーボード / SR)
7. ⬜ セキュリティ & プライバシー / E2E 暗号化
8. ⬜ ダイアグラム & 自動レイアウト(コネクタ・整列)
9. ⬜ エクスポート / 相互運用(SVG/PDF/PNG・import)
10. ⬜ プラグイン / 拡張アーキテクチャ(サンドボックス)

---

## 1. 無限キャンバス & 描画パフォーマンス ✅

### 収集情報(arxiv / GitHub)
- [GitHub: xiaoiver/infinite-canvas-tutorial](https://github.com/xiaoiver/infinite-canvas-tutorial) — 無限キャンバスの体系的チュートリアル。culling・dirty-rect・空間索引(R-tree/RBush)・LOD・ピッキングを網羅。**Board の設計参照に最適**。
- [GitHub: antvis/infinite-canvas-tutorial](https://github.com/antvis/infinite-canvas-tutorial) — 上記の AntV 版。レッスン20で協調も扱う。
- [GitHub: tldraw/tldraw](https://github.com/tldraw/tldraw) — Canvas2D + viewport culling + 空間索引で数千オブジェクトを 60fps。実運用の手本。
- [GitHub: light-magician/infinite-canvas-webgl](https://github.com/light-magician/infinite-canvas-webgl/) — Rust/WebGL/WASM の高性能無限キャンバス実験(※WASM は Board の単一HTML原則と相反、知見のみ採用)。
- [GitHub topic: infinite-canvas](https://github.com/topics/infinite-canvas) — 関連実装の一覧。
- [GitHub: pixijs issue #7565 — Canvas2D vs WebGL for sprites](https://github.com/pixijs/pixijs/issues/7565) — 少数オブジェクトでは Canvas2D が WebGL より速い場合がある(Board の Canvas2D 採用を支持)。
- [GitHub: pixijs issue #1246 — slow big stage](https://github.com/pixijs/pixijs/issues/1246) — 大規模ステージの描画最適化議論(カリング/バッチ)。
- [arxiv 1909.05511 — LOCALIS: Locally-adaptive Line Simplification for GPU Vector Viz](https://arxiv.org/pdf/1909.05511) — Douglas-Peucker による **ズーム連動の線 LOD**。ペンストロークの間引きに直結。
- [arxiv 2009.03368 — Virtual Frame Buffer for Parallel Rendering of Large Tiled Displays](https://arxiv.org/pdf/2009.03368) — タイル分割描画の抽象化。
- [arxiv 1001.1718 — Tiling for Performance Tuning on GPUs](https://arxiv.org/pdf/1001.1718) — タイリングの基礎。
- 参考: Figma は C++/WASM のタイルベースレンダラ→WebGL/WebGPU、Vello/xilem は Compute Shader で 2D(将来技術)。

### Board への改善点
- **P1: viewport カリング** — `draw()` で画面外 bbox の shape を skip。最も安価な大規模対策(`docs/research-improvements.md` 項目C と統合、空間索引で O(1) 化)。
- **P2: ペンストロークの LOD** — ズームアウト時に `pts` を Douglas-Peucker で間引いて描画/出力負荷削減(LOCALIS)。サブピクセル間引きは既存だがズーム連動 LOD は未実装。
- **P2: dirty-rect / 静的レイヤキャッシュ** — 全再描画をやめ、変化領域のみ or OffscreenCanvas 静的層を合成(tldraw/Figma)。
- **設計判断: Canvas2D を維持** — WebGL/WASM 化は単一HTML・依存ゼロ・サイズ予算を破るため不採用。索引+カリング+LOD で十分(pixijs の知見)。

---

## 2. リアルタイム協調 & CRDT 同期 ✅

### 収集情報(arxiv / GitHub)
- [arxiv 1805.06358 — Conflict-free Replicated Data Types (Shapiro et al.)](https://arxiv.org/pdf/1805.06358) — CRDT の基礎(順序非依存で決定的収束)。
- [arxiv 2310.18220 — Approaches to Conflict-free Replicated Data Types](https://arxiv.org/abs/2310.18220) — op-based / state-based / delta の俯瞰(survey)。
- [arxiv 2212.02618 — Collabs: Flexible & Performant CRDT Framework](https://ar5iv.labs.arxiv.org/html/2212.02618) — 合成可能 CRDT。shared whiteboard デモあり。
- [arxiv 2304.03141 — For-Each Operations in Collaborative Apps](https://arxiv.org/pdf/2304.03141) — リストの全要素一括変更 op(並行挿入も含む)。**グループ移動/整列の同期** に有用。
- [arxiv 2409.09934 — Coordination-free Collaborative Replication (OT ベース)](https://arxiv.org/html/2409.09934v1) — 調整メッセージ不要の整合。
- [arxiv 2311.14007 — Extending JSON CRDTs with Move Operations](https://arxiv.org/pdf/2311.14007) — JSON CRDT への move op(z順序/移動の同時編集)。
- [arxiv 2404.11308 — Undo and Redo Support for Replicated Registers](https://arxiv.org/abs/2404.11308) — 協調環境での undo の正しさ。
- [GitHub: conclave-team/conclave](https://github.com/conclave-team/conclave) — **CRDT + WebRTC の P2P 協調エディタ参照実装**(mesh / シグナリング / 直接データチャネル)。
- [GitHub: alexanderop/awesome-local-first](https://github.com/alexanderop/awesome-local-first) — CRDT/暗号化/P2P プロトコル(libp2p, Hypercore, Iroh)の網羅リスト。
- [GitHub: SchoolAI/loro-extended](https://github.com/schoolAI/loro-extended) — Loro に schema/sync/persistence。SSE+WebRTC のデュアルアダプタ(耐障害な低遅延同期パターン)。
- [GitHub: bimcc/BimccRTC](https://github.com/bimcc/BimccRTC) — WebRTC ベース協調ホワイトボード実装例。

### Board への改善点
- **本命(依存ゼロ): 重い CRDT ライブラリ(Yjs/Automerge/Loro=WASM/別バンドル)を避け**、Excalidraw 方式の
  `version`+`versionNonce` LWW + fractional index + Kleppmann move op で構成(`research-improvements.md` 項目 K/L/A)。
- **WebRTC P2P 構成**: conclave の mesh + 手動/最小シグナリング設計を踏襲(Board は既に手動シグナリング有)。
- **グループ操作の同期**: for-each op(2304.03141)で複数選択の移動/整列を 1 op として安全に伝播。
- **受信 op の検証強化**: 現状 `add` のみ検証(レビュー指摘)→ 全 op の payload を検証して NaN/型崩れを排除。
- **協調 undo**: 巻き戻しでなく因果情報付き逆 op(2404.11308)。

---

## 3. フリーハンド作画 / ストローク表現(筆圧・平滑化)✅

### 収集情報(arxiv / GitHub)
- [GitHub: steveruizok/perfect-freehand](https://github.com/steveruizok/perfect-freehand) — 可変幅ストロークの定番(`getStroke`、thinning/streamline/smoothing/pressure)。~2kB gzip。**アルゴリズムを自前移植可能**。
- [GitHub: google/ink-stroke-modeler](https://github.com/google/ink-stroke-modeler) — 入力の平滑化 + **軌跡予測**(知覚遅延の低減)。C++ だがモデル(バネ・Kalman 的)が参考になる。
- [GitHub: jakubfiala/atrament](https://github.com/jakubfiala/atrament) — 5.9kB の軽量・自然な描き味。native Canvas API ベース(カスタム曲線を計算しない軽量路線)。
- [GitHub: personalizedrefrigerator/js-draw](https://github.com/personalizedrefrigerator/js-draw) — pen/touch/mouse 対応のフリーハンド作画ライブラリ全体像。
- [GitHub: apedyashev/canvas-realistic-pen](https://github.com/apedyashev/canvas-realistic-pen) — 署名向けの滑らかなペン。
- [GitHub: microsoft/InkMLjs](https://github.com/microsoft/InkMLjs) — InkML(ストローク交換フォーマット)。相互運用の参考。
- [arxiv 1402.5187 — Intelligent Framework for Pressure-based 3D Curve Drawing](https://arxiv.org/pdf/1402.5187) — 筆圧の意味づけ・解釈。
- [arxiv 2411.05160 — Data-Driven Pressure Distribution Rendering on a Finger Pad](https://arxiv.org/pdf/2411.05160) — 筆圧分布のデータ駆動レンダリング。
- 技術一般: Catmull-Rom / 三次 Hermite スプライン、最小二乗による幅・回転の平滑化(複数特許文献より)。

### Board への改善点
- **P1: ストローク平滑化** — 現状 `pts` は生ポリライン描画。入力点を streamline(低域通過)し、**Catmull-Rom / 二次ベジエ**で描く。筆圧無しでも描き味が大幅向上(atrament 路線=軽量)。
- **P1: 可変幅(perfect-freehand 移植)** — pointer events の `pressure`(非対応は速度)で thinning。SVG 出力は filled outline path に(`research-improvements.md` 項目B と統合)。
- **P2: 軌跡予測** — ink-stroke-modeler の予測で入力遅延を体感的に隠す。
- **設計判断**: 外部 lib は使わず、perfect-freehand/atrament の **アルゴリズムを ~200 行で内製**(単一HTML維持、~2kB gzip 想定で予算内)。

---

## 4. スケッチ/図形認識 & beautification ✅

### 収集情報(arxiv / GitHub)
- [GitHub: MathieuLoutre/shape-detector](https://github.com/MathieuLoutre/shape-detector) — **$1 Recognizer ベースの図形/ジェスチャ検出**。client/Node 両対応、circle/triangle/rectangle 等。**依存ゼロで移植可能、最有力 MVP**。
- [GitHub: jupiterio/shape-detector](https://github.com/jupiterio/shape-detector) — 上記の派生。
- [GitHub: nok/onedollar-unistroke-recognizer](https://github.com/nok/onedollar-unistroke-recognizer) — $1 の実装(<100行)。
- [GitHub: Bledixon/shape-recognizer-js](https://github.com/Bledixon/shape-recognizer-js) — ml5/p5 ベース(ML 版、参考)。
- [arxiv 2306.05832 — Sketch Beautification (part beautification + structure refinement)](https://arxiv.org/pdf/2306.05832) — 認識後の **幾何制約整形**(直角・等径など)。
- [arxiv 1704.03477 — sketch-rnn: A Neural Representation of Sketch Drawings](https://arxiv.org/pdf/1704.03477) — ストローク列の生成モデル(seminal)。
- [arxiv 1811.08170 — Sketch-R2CNN: Attentive Vector Sketch Recognition](https://arxiv.org/pdf/1811.08170) — RNN+CNN のベクタースケッチ認識。
- [arxiv 2403.09344 — SketchINR: Sketches as Implicit Neural Representations (2024)](https://arxiv.org/html/2403.09344v1) — 暗黙的神経表現。
- [arxiv 2508.01237 — SketchAgent: Hand-Drawn Sketches → Structured Diagrams](https://arxiv.org/html/2508.01237v1) — 認識+記号推論+反復精緻化の統合パイプライン。
- [arxiv 2405.03099 — SketchGPT: Autoregressive Sketch Generation & Recognition](https://arxiv.org/html/2405.03099v1) — 自己回帰モデル。

### Board への改善点
- **P1(依存ゼロ MVP): $1/shape-detector 移植** — pen-up 時にラフ図形を rect/circle/triangle/line/arrow へ **snap(beautify)**。opt-in トグル。完全オフライン・単一HTML維持(`research-improvements.md` 項目M)。
- **P2: ジェスチャコマンド** — 同じ recognizer で「ぐるぐる消し(scribble-to-erase)」等(Excalidraw/メモ系の定番)。
- **P2: 構造精緻化** — 認識図形に幾何制約(直角・等径・整列)を適用(2306.05832)。
- **将来(opt-in ML, BYOK/WASM)**: sketch-rnn / SketchINR / SketchAgent で図表生成・補完・手書き認識。クラウド必須にしない。

---

## 残りカテゴリー(次回以降の /loop で順次充填)

5〜10 は上記と同じ書式(収集 ~10 件 + 改善点)で順次追記する。各カテゴリー完了時に進捗チェックを更新。
