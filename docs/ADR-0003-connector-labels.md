# ADR-0003 — コネクタ(エッジ)ラベル

- Status: Accepted (implemented)
- Date: 2026-06-22
- 関連: spec §5(編集機能)、ADR なしの既存「図形ラベル」(frame/rect/ellipse)、bound connectors(§connEnds)

## なぜ (Context)

Board の差別化要素は **bound connectors**(line/arrow の端点を図形に結合し、図形移動に追従)だが、
コネクタに**テキストを載せられない**ため、フローチャート/関係図の決定打が欠けていた
(例: 判断分岐の "yes"/"no"、関係名)。図形ラベル(frame/rect/ellipse + 直近で canvas 描画も整合)と
汎用インラインラベルエディタ(ダブルクリック → `upd` op)が既にあるため、これをコネクタへ拡張すれば
**最小コストでフローチャート能力**が得られる。

## 何を (Decision)

line/arrow に既存の `label` フィールドを許可し:

1. **編集**: コネクタをダブルクリック → 既存インラインラベルエディタを**結合端点の中点**に開く。
   コミットは既存の `upd` op(可逆・sync 対応)を再利用。エディタ生成を `openLabelEditor()` に抽出し、
   box 図形/コネクタで共有(frame の太字スタイルは引数で分岐、既存挙動を厳密維持)。
2. **描画(canvas)**: `_drawConnLabel(s,c)` が `connEnds` 中点に、線が文字を貫かないよう **paper 色の
   背景ピル**付きでラベルを描画(12px、stroke 色、world 座標なのでズーム追従)。
3. **描画(SVG)**: `buildSVG` の line/arrow 分岐が同じ中点に `<rect>`(背景)+ `<text>` を出力。
   属性は全て `_esc`(注入不可)。**表示=出力パリティ**を維持。

## 代替案 (Alternatives)

- **コネクタ専用の text shape を中点に固定**: shape 数が倍増し、移動追従・削除連動・undo が複雑化。却下。
- **別の編集 UI(ポップオーバー等)**: 既存ラベルエディタで十分。新 UI は単一ファイル/ゼロ摩擦に反する。却下。
- **多段ラベル/リッチテキスト**: スコープ過大。1 行プレーンラベルに限定(maxlength=80、既存と同じ)。

## 影響 (Consequences)

- データモデル不変(`label` は既存フィールド)。保存/同期/undo/redo/hit-test/bbox に影響なし
  (bbox はラベルを含めない — エッジ中点の小さなテキストは選択/カリングに実害なし)。
- IME 安全(エディタの `isComposing` ガードを継承)、Escape で破棄、Enter で確定。
- 非空虚テスト: `buildSVG` でラベル付きアロー→中点に `<text>` + ラベル文字、未ラベルは出さない、
  敵対的ラベルは `_esc` でエスケープ。中点計算と `openLabelEditor`/`_drawConnLabel` の存在を presence で固定。
