# カテゴリー別 改善点調査 (arxiv + GitHub)

> Board(単一HTML / offline-first 無限ホワイトボード)を 10 カテゴリーに分類し、各カテゴリーごとに
> arxiv.org と GitHub から関連情報を ~10 件集め、改善点を洗い出す。`/loop` で反復実行し、各回 ~2 カテゴリーを埋める。
> 制約は常に **単一HTML / 依存ゼロ / オフライン等価 / サイズ予算(gzip 44KB)**。総括的な優先度は
> `docs/research-improvements.md` を参照。調査開始: 2026-06-05。

## 10 カテゴリーと進捗

1. ✅ 無限キャンバス & 描画パフォーマンス
2. ✅ リアルタイム協調 & CRDT 同期
3. ⬜ フリーハンド作画 / ストローク表現(筆圧・平滑化)
4. ⬜ スケッチ/図形認識 & beautification
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

## 残りカテゴリー(次回以降の /loop で順次充填)

3〜10 は上記と同じ書式(収集 ~10 件 + 改善点)で順次追記する。各カテゴリー完了時に進捗チェックを更新。
