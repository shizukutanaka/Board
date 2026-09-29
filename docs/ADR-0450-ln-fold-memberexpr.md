# ADR-0450: `X.Y.length` member-expr も `_ln` fold

## 状態
実装済 (v1.7.485)

## 背景
ADR-0447 は単一識別子レシーバのみ対象だった。`s.pts.length`・
`op.shapes.length` 等の member-expr レシーバが 46 箇所残存。

## 決定
レシーバ正規表現を `[\w$]+(?:\.[\w$]+)+` に拡張して同じ否定先読みで fold
(`a.b.length` → `_ln(a.b)`、~92B 追加回収)。`a.b?.length` は `?` で
レシーバが切れるため自然に除外。

## 影響
- raw 524,058 → 523,966B (~322B headroom)。行動・literal テスト同期済。
