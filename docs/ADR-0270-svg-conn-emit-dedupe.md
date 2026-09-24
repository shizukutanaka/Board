# ADR-0270: SVG export conn パス/ラベル出力の集約

## 状態
承認 — round40

## 背景
SVG export のコネクタ出力で同一の stroke 属性文字列
(`fill="none" stroke="…" stroke-width="…" stroke-linecap="round" …`) が
14 箇所、`_connLabelSVG` 呼出パターンが 8 箇所に複写されていた。
さらに `const lm=_xxxLabelXY(s)` が 6 箇所で未使用のまま残存
(続く行が `_connLabelXY` を再計算していた) — dead code。

## 決定
shape ループ内の共通変数 (stroke/SZ/dA/a/_sh) を捕らえる3ヘルパ:
- `_sp(d,j)` — conn `<path>` (j=1 で stroke-linejoin 追加)
- `_po(pts)` — conn `<polyline>`
- `_cL()` — ラベル位置算出 + `_connLabelSVG` 発行
未使用 `lm` 6 行を削除。~1.9KB 回収。

## 断念した代替案
- rect/ellipse/diamond まで同一テンプレート化 — それらは `rT` の挿入
  位置が異なりヘルパが複雑化するため conn のみ。

## 影響
512KB 上限のヘッドルームを ~1KB → ~3KB に回復。1977 全緑。
