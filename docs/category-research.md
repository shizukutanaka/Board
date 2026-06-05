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
5. ✅ local-first 永続化 / PWA / ストレージ
6. ✅ アクセシビリティ(canvas a11y / キーボード / SR)
7. ✅ セキュリティ & プライバシー / E2E 暗号化
8. ✅ ダイアグラム & 自動レイアウト(コネクタ・整列)
9. ✅ エクスポート / 相互運用(SVG/PDF/PNG・import)
10. ✅ プラグイン / 拡張アーキテクチャ(サンドボックス)

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

## 5. local-first 永続化 / PWA / ストレージ ✅

### 収集情報(arxiv / GitHub)
- [GitHub: kachurun/opfs-worker](https://github.com/kachurun/opfs-worker) — **OPFS** を Node.js fs 風 API で。ファイル操作は IndexedDB より高速。画像など大バイナリの保管に有効。
- [GitHub: paldepind/synceddb](https://github.com/paldepind/synceddb) — IndexedDB の上に載る軽量な offline-first 同期層(設計参考)。
- [GitHub: pazguille/offline-first](https://github.com/pazguille/offline-first) — offline-first Web アプリの知見集。
- [GitHub: alexanderop/awesome-local-first](https://github.com/alexanderop/awesome-local-first) — local-first/CRDT/暗号化の網羅。
- [GitHub: johnnyreilly/offline-storage-in-a-pwa](https://github.com/johnnyreilly/offline-storage-in-a-pwa/blob/master/BLOG.md) — PWA のオフライン保存実装解説。
- 参考(重量級・原則外): localForage(IDB ラッパ), PouchDB(CouchDB 同期), GUN.js / OrbitDB(P2P), PGlite / Turso(WASM SQLite), Y-Sweet(Yjs 永続化)。
- [arxiv 2304.07133 — LoRe: Verifiably Safe Local-First Software](https://arxiv.org/pdf/2304.07133) — 安全性/可用性のトレードオフを検証可能にするプログラミングモデル。
- [arxiv 1611.05346 — File Synchronization Systems Survey](https://arxiv.org/abs/1611.05346) — 集中/分散の同期方式の俯瞰。
- [arxiv 2411.10883 — Covert and Side Channel Attacks via syncfs](https://arxiv.org/html/2411.10883) — 同期機構のセキュリティ留意点。
- 技術一般: journaling / write-ahead logging / copy-on-write で耐障害性(durability)を確保。

### Board への改善点
- **P1: 画像を OPFS にオフロード** — 現状 `dataUrl` を shape に持ち IndexedDB スナップショット/同期 payload を肥大化(同期 flooding はレビュー既知)。バイナリは OPFS に置き、shape は参照のみ持つ。
- **P1: Persist の堅牢化** — `Persist.open()` の reject(プライベートモード/容量拒否)を try/catch し「永続化なしで継続」へフォールバック(deep-scan 指摘)。`onblocked` も処理。
- **P2: スキーマ移行** — IDB ドキュメントの `v` を使ったバージョン移行パスを明文化(将来の shape 型変更に備える)。
- **P2: Longevity(可搬性)** — 文書全体の `.board`(JSON)エクスポート/インポートを追加(SVG/PNG/PDF は既存)。local-first の Longevity 原則。
- **設計判断**: PouchDB/GUN 等は導入しない(単一HTML/依存ゼロ)。**内蔵 IndexedDB + 任意 OPFS** で十分。

---

## 6. アクセシビリティ(canvas a11y / キーボード / SR)✅

### 収集情報(arxiv / GitHub)
- [GitHub: CurriculumAssociates/createjs-accessibility](https://github.com/CurriculumAssociates/createjs-accessibility) — **canvas を DOM ミラーと同期**させ SR/点字ディスプレイで操作可能にするモジュール。Board の a11y 実装の直接的手本。
- [GitHub: bpmn-io/bpmn-js #1548](https://github.com/bpmn-io/bpmn-js/issues/1548) — ダイアグラムの SR 対応議論(各要素を focusable に + 役割/関係を自己記述)。
- [GitHub: mermaid-js/mermaid #5632](https://github.com/mermaid-js/mermaid/issues/5632) — 図のキーボード/SR 対応。
- [GitHub: apache/echarts #18585](https://github.com/apache/echarts/issues/18585) — 「a11y を謳うがキーボード操作不可」問題(role=img + aria-label の最低限フォールバック)。
- [GitHub: mui/mui-x #13113](https://github.com/mui/mui-x/issues/13113) — チャートのキーボードナビ + SR。
- [arxiv 2205.04917 — Rich Screen Reader Experiences for Accessible Data Visualization](https://arxiv.org/pdf/2205.04917) — **structure / navigation / description** の 3 次元設計。Board の図形巡回設計に直結。
- [arxiv 2403.06693 — Chart4Blind: Accessible Chart Conversion](https://arxiv.org/html/2403.06693) — 半自動で SR/点字/触図向け出力。
- [arxiv 2410.20545 — ChartA11y: Accessible Touch Experiences](https://arxiv.org/html/2410.20545v1) — タッチ + SR の操作設計。
- [arxiv 2503.17517 — Accessible Text Descriptions for UpSet Plots](https://arxiv.org/pdf/2503.17517) — 構造化図の自動テキスト記述。

### Board への改善点
- **P1: DOM ミラー a11y**(createjs-accessibility パターン)— 画面外に shape ツリーを反映、各 shape を focusable + role/aria-label にし、SR/点字で巡回可能に(`research-improvements.md` 項目I の具体手段)。
- **P1: structure/navigation/description**(2205.04917)— frame→shape の階層ナビ、Tab/矢印巡回、読み上げ記述(例「青い矩形、左上、Frame 1 内」)。
- **P2: 自動 alt テキスト** — shape 種別の集計 + レイアウトでボード全体要約を生成。カテゴリー4 の図形認識で意味ラベル付与。
- **P2: キーボードでの図形作成/選択** — 現状は作成がマウス専用。配置・選択巡回をキーボードでも可能に(WCAG Keyboard Accessible)。
- 最低限フォールバック: canvas に `role="img"` + 詳細 `aria-label`(既存の `role="application"` と併せ整備)。

---

## 7. セキュリティ & プライバシー / E2E 暗号化 ✅

### 収集情報(arxiv / GitHub)
- [GitHub: bradyjoslin/webcrypto-example](https://github.com/bradyjoslin/webcrypto-example) — **PBKDF2 → AES-GCM** のブラウザ暗号化/復号の実例。Board の同期暗号の直接の雛形。
- [GitHub gist: chrisveness — AES-GCM (SubtleCrypto)](https://gist.github.com/chrisveness/43bcda93af9f646d083fad678071b90a) — 最小実装。
- [GitHub: korywka/crypto-aes-gcm](https://github.com/korywka/crypto-aes-gcm) — テキストの AES-GCM 暗号化。
- [GitHub: vats98754/e2ee-messenger](https://github.com/vats98754/e2ee-messenger) — **完全クライアントサイド E2E**(localStorage + WebCrypto、ハイブリッド RSA+AES-256)。peer 鍵交換の参考。
- [GitHub: SocialGouv/aes-gcm-rsa-oaep](https://github.com/SocialGouv/aes-gcm-rsa-oaep) — AES-GCM + RSA-OAEP ハイブリッド(TS)。
- [GitHub gist: themikefuller — Web Crypto AES-GCM](https://gist.github.com/themikefuller/aca9491f960cbb8d94cdd7236698f0cd) — 実装例。
- [arxiv 2409.14252 — Collaborative Text Editing with Eg-walker (Better, Faster, Smaller)](https://arxiv.org/pdf/2409.14252) — op-log/履歴を小さく速く保つ手法(E2E を載せる土台としても有用)。
- [arxiv list: cs.CR 2024-07](https://arxiv.org/list/cs.CR/2024-07) — 暗号・セキュリティの最新動向ソース。
- 技術一般: グループ鍵 = メッセージ鍵で暗号化したグループ鍵、ペアワイズ chain key(Signal 的)で配布。

### Board への改善点
- **P1: 同期 payload の AES-GCM 暗号化** — URL fragment(`#room:key`、サーバ非通過)から鍵を得て、各 op を WebRTC/BroadcastChannel 送出前に暗号化。**WebCrypto 内蔵=依存ゼロ**(`research-improvements.md` 項目H の具体実装)。
- **P1: op-log の署名(authenticate, not just validate)** — peer ごとに WebCrypto ECDSA 鍵を持ち op に署名。レビューで指摘した「悪意ある peer の op 注入」を**検証より深い層で**解決。
- **P2: peer 鍵交換** — ECDH/RSA-OAEP でルーム AES 鍵を配布(vats98754 パターン)。簡易版は URL fragment 共有。
- **P2: at-rest 暗号化** — パスフレーズ由来鍵で IndexedDB ドキュメントを任意暗号化。
- **留意**: 同期機構の side-channel(カテゴリー5 の syncfs 論文)。

---

## 8. ダイアグラム & 自動レイアウト(コネクタ・整列)✅

### 収集情報(arxiv / GitHub)
- [GitHub gist: jose-mdz — Orthogonal Diagram Connector](https://gist.github.com/jose-mdz/4a8894c152383b9d7a870c24a04447e4) — **小さな直交コネクタ・ルーティング**。単一HTMLに移植しやすい。
- [GitHub: kieler/elkjs](https://github.com/kieler/elkjs) — ELK レイアウト(直交ルーティング・階層)。高機能だが大型 JS のため**丸ごと取り込みは原則外**(アルゴリズム参考)。
- [GitHub: dagrejs/dagre](https://github.com/dagrejs/dagre) — 有向グラフレイアウト(現在メンテ停止、参考)。
- [GitHub: xyflow/xyflow discussion #1786](https://github.com/xyflow/xyflow/discussions/1786) — レイアウトエンジン選定の議論。
- [GitHub: Nic30/d3-hwschematic](https://github.com/Nic30/d3-hwschematic) — ELK ベースの回路図ビジュアライザ。
- [arxiv 2309.01671 — A Simple Pipeline for Orthogonal Graph Drawing](https://arxiv.org/pdf/2309.01671) — **移植しやすい直交描画パイプライン**(crossing 削減→直交ルーティング→force 配置)。
- [arxiv 1807.09368 — Graph Compact Orthogonal Layout Algorithm](https://arxiv.org/pdf/1807.09368) — コンパクト直交レイアウト。
- [arxiv 2008.10583 — Layered Drawing with Generalized Port Constraints](https://arxiv.org/pdf/2008.10583) — 階層(Sugiyama)+ポート制約。
- [arxiv 2008.11235 — Accelerating Force-Directed Graph Drawing with RT Cores](https://arxiv.org/pdf/2008.11235) — force-directed の高速化。
- [arxiv 1712.05548 — Persistent Homology Guided Force-Directed Layouts](https://arxiv.org/pdf/1712.05548) — 構造保存レイアウト。

### Board への改善点
- **P1: バインド可能コネクタ** — Board は arrow はあるが shape に束縛されない。図形に紐づき、移動時に再ルートするコネクタを追加(Miro/Excalidraw/FigJam の定番)。jose-mdz の直交ルータを **インライン移植**(単一HTML可)。
- **P2: スマートガイド/スナップ** — 既存の整列 op に加え、他 shape の辺・中心への吸着ガイド(Figma 的)。
- **P2: 任意の自動レイアウト** — フローチャート用に最小 Sugiyama / 直交パイプライン(2309.01671, 1807.09368)を内製。ELKjs は単一HTMLに収まらないので不採用。
- **設計判断**: レイアウトは **opt-in & 純関数**。常時実行や重い依存は入れない。

---

## 9. エクスポート / 相互運用 ✅

### 収集情報(arxiv / GitHub)
- [GitHub: excalidraw/mermaid-to-excalidraw](https://github.com/excalidraw/mermaid-to-excalidraw) — **Mermaid テキスト → 図形** 生成。テキストからの作図 import の参考。
- [GitHub: sindrel/excalidraw-converter](https://github.com/sindrel/excalidraw-converter) — Excalidraw → draw.io/Gliffy/Mermaid 変換(相互運用の設計)。
- [GitHub: rmoff/obsidian-canvas-export](https://github.com/rmoff/obsidian-canvas-export) — canvas を HTML/Excalidraw/Mermaid/D2/PDF へエクスポート。
- [GitHub: excalidraw discussion #3545](https://github.com/excalidraw/excalidraw/discussions/3545) — 「.excalidraw は他アプリで読めるか」= 独自 JSON の相互運用課題。
- [GitHub: excalidraw discussion #3778](https://github.com/excalidraw/excalidraw/discussions/3778) — エクスポートユーティリティの仕組み。
- [arxiv 2311.05276 — SAMVG: Multi-stage Image Vectorization (SAM)](https://arxiv.org/html/2311.05276) — 画像→SVG ベクター化。
- [arxiv 2406.09794 — SuperSVG: Superpixel-based Vectorization](https://arxiv.org/pdf/2406.09794) — coarse-to-fine ベクター化。
- [arxiv 2312.11556 — StarVector: Generating SVG Code from Images/Text](https://arxiv.org/html/2312.11556v3) — SVG コード生成。
- [arxiv 2504.06263 — OmniSVG: Unified SVG Generation](https://arxiv.org/html/2504.06263) — 統合 SVG 生成。
- 技術一般: ベクター化は traditional(potrace 系)/ optimization / deep-learning の 3 系統。

### Board への改善点
- **P1: ドキュメント化された開放フォーマット** — `.board`(JSON スキーマを公開)+ **SVG ラウンドトリップ**(SVG import→shapes)。Excalidraw の独自 JSON と差別化(Longevity/相互運用)。
- **P1: `.excalidraw` import** — 競合からの移行導線(オンボーディング)。
- **P2: Mermaid 等のテキスト作図 import** — 部分文法を shapes に変換(opt-in、依存ゼロのパーサ)。
- **P2: 画像トレース(opt-in)** — potrace 系の軽量ベクター化で画像→編集可能 shape。重い ML は不採用、簡易トレーサを任意機能に。
- **既存強化**: PNG/SVG/PDF 済み。クリップボードへ画像コピー、frame 単位エクスポートを追加。

---

## 10. プラグイン / 拡張アーキテクチャ(サンドボックス)✅

### 収集情報(arxiv / GitHub)
- [GitHub: JetBrains/websandbox](https://github.com/JetBrains/websandbox) — **sandboxed iframe 内で JS を実行**するライブラリ。プラグイン実行基盤の手本。
- [GitHub: TooTallNate/SandboxJS](https://github.com/TooTallNate/SandboxJS) — ブラウザ JS サンドボックス。
- [GitHub: sebastian-software/interframe](https://github.com/sebastian-software/interframe) — postMessage ベースの軽量フレーム間通信(Penpal 同様の RPC)。
- [GitHub: krakenjs/zoid #315](https://github.com/krakenjs/zoid/issues/315) — iframe `sandbox` 属性の扱い(クロスドメインコンポーネント)。
- [GitHub topic: postmessage](https://github.com/topics/postmessage) — 関連実装群。
- [arxiv 1905.08192 — Secure Extensibility via Plugin Sandboxing](https://arxiv.org/pdf/1905.08192) — 未信頼サードパーティコードの安全な拡張。
- [arxiv 2112.15561 — SoK: On the Analysis of Web Browser Security](https://arxiv.org/pdf/2112.15561) — ブラウザのサンドボックス/分離の体系。
- [arxiv 2504.00018 — SandboxEval: Securing Test Environment for Untrusted Code](https://arxiv.org/html/2504.00018v1) — 未信頼コード実行環境の評価。
- [arxiv 2509.07757 — Empirical Security of Software-based Fault Isolation](https://arxiv.org/html/2509.07757v1) — SFI の堅牢性。
- 技術一般: capability isolation、misbehaving plugin の penalty/disable、リソース(FS/network)アクセス制限。

### Board への改善点
- **P1: sandboxed iframe + postMessage のプラグイン API**(roadmap v2.0)— プラグインは制約 API(shape 読取・op 経由の追加・カスタム shape の描画/hit-test)だけを postMessage で行使。DOM/network/IndexedDB へ直接アクセス不可。websandbox/interframe パターンを最小移植。
- **P1: capability isolation** — プラグインの op はホストが検証してから適用(レビュー指摘の op 検証強化と接続)。
- **P2: カスタム shape 型** — サンドボックス内で render + hit-test を登録。
- **P2: 異常プラグインの自動無効化**(penalty point)。
- **設計判断**: コア本体は単一HTML・依存ゼロを維持。プラグインは本質的に外部=別 blob/iframe として隔離ロード。コアの原則は不変。

---

## 総括: 横断的な最優先改善(10カテゴリーの統合)

各カテゴリーの P1 を、Board の原則(単一HTML/依存ゼロ/オフライン/予算)と効果で横断ランキング:

| 順 | 改善 | 由来カテゴリー | なぜ今 |
|---|---|---|---|
| 1 | **fractional index z-order + 受信 op の全検証** | 2 | レビュー指摘の構造課題 + 同期衝突解消を一手で |
| 2 | **viewport カリング + 空間索引** | 1 | 最も安価な大規模 60fps 化(architecture.md 予告済) |
| 3 | **ストローク平滑化 + perfect-freehand 移植** | 3 | 体感品質の最大要因、依存ゼロで可能 |
| 4 | **$1/shape-detector による beautify(opt-in)** | 4 | AI 機能の現実的な入口、完全オフライン |
| 5 | **WebCrypto AES-GCM + op 署名** | 7 | Privacy 原則 + 悪意 peer 対策(検証より深い層) |
| 6 | **DOM ミラー a11y(structure/nav/description)** | 6 | v2.0 外部監査への前進 |
| 7 | **画像の OPFS オフロード + Persist 堅牢化** | 5 | スナップショット肥大/プライベートモード対策 |
| 8 | **バインド可能コネクタ(直交ルータ移植)** | 8 | ダイアグラム用途の定番機能 |
| 9 | **開放フォーマット + `.excalidraw` import** | 9 | Longevity/移行導線 |
| 10 | **sandboxed iframe プラグイン API** | 10 | v2.0 拡張性、コア原則を保ったまま |

共通方針: **重量級依存(WASM CRDT / WebGL エンジン / ELKjs / ML ランタイム)は本体に組み込まず**、必要時はアルゴリズムを内製移植 or opt-in 外部ロード。各項目は ADR を 1 枚書いてから着手(CLAUDE.md 準拠)。総括的優先度は `docs/research-improvements.md` と整合。

> 調査完了: 10/10 カテゴリー。各カテゴリー ~10 件の arxiv/GitHub 出典 + Board 固有の改善点を収録。
