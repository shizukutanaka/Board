# ADR-0593: エクスポートの bbox は可視図形のみで計算する

## 状態

実装済 (round302)。

## 背景

`buildSVG` / `_renderPngBlob` は viewBox・キャンバスサイズの決定に `_bA(shapes)` と
**フィルタ前の全図形**の union bbox を使っていた。図形の描画自体は `_sv`/`drawShape`
で隠されていたため hidden 図形は描かれないが、**その位置・寸法が余白領域として
漏洩**していた — 不可視内容の存在と位置をエクスポート画像から推測できた。

(グループハローの ADR-0592、ピア選択アウトラインの ADR-0576 と同じ hidden parity
クラス。)

## 決定

`_renderPngBlob` と `buildSVG` の bbox 計算を `shapes.filter(_sv)` に変更 — 可視図形
のみで包絡。全図形非表示では `bboxAll` が null を返し従来通り empty トースト。

## 影響

- エクスポート画像・SVG に不可視コンテンツの領域が余白として現れない。
- 選択エクスポートでも同一路径を通るため同規則が適用される。
- テスト: hidden 図形が viewBox を膨らませないこと、全非表示で null を返すことを assert。
