# ADR-0596: hidden parity の派生レンダリング面規則を文書化する

## 状態

実装済 (round305)。

## 背景

ADR-0566/0568 で確立した「非表示図形は選択されない」不変条件は、ADR-0576
(ピア選択アウトライン) で初めて描画系へ拡張され、ADR-0592–0595 で
グループハロー・PNG/SVG エクスポート bbox・excalidraw・ミニマップと
立て続けに同型の漏洩が4件修正された — パターン化した実害クラスである。

architecture.md には選択不変条件の記述があったが、派生レンダリング面
(選択以外の「見える/位置が漏れる」経路) の規則は未文書化だった。

## 決定

- architecture.md の hidden parity 節に派生面規則を追記: `_grpMapGet`・
  `_renderPngBlob`/`buildSVG`・`excScene`・Minimap scene は `_sv` で
  フィルタ。例外はデータ保持経路 (.board は `visible` 保持、
  `boardToDrawio` は `visible="0"` emit)。
- spec.md の「非表示/再表示」節も同期。
- test.mjs に4箇所の `_sv`/`_hd` フィルタのソースピンを追加。

## 影響

- 今後「図形を描く・位置を導出する」新機能は `_sv` フィルタが必須であることが
  明示された — 漏洩パターンの再発防止。
- データ往復 (.board/.drawio) が例外である理由も明記 (fidelity vs leak の区別)。
