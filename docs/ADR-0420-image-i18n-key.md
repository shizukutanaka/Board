# ADR-0420: `image` を T.k に追加 (describeShape ロケール欠落修正)

## 状態
実装済 (v1.7.455)

## 背景
`describeShape` は `T.k?.[s.type]??s.type` で図形名をローカライズするが、
`image` キーだけが T.k 未収録だった — image 図形の announce/DOM mirror
がロケールをすり抜けて英字 `image` にフォールバックしていた
(image はツールバー tool ではなく paste/drop 経由なので UI 上は
顕在化していなかった)。

## 決定
- `image:'画像'` (ja) + `image:'Image'` (en) を T.k に追加。
- T.k 型網羅のガードテストを追加 — `_TYPES` 全10型が両ロケールの
  T.k で解決できることを assert。

## 影響
- ja 環境で画像選択・DOM mirror が正しく「画像」と読み上げられる。
- `_TYPES` 全型が T.k に揃って complete。

## 断念した代替案
- `T.k` を `_TYPES` から機械生成: キーの日本語訳が機械化できず
  現状維持が妥当 — ガードテストで将来の欠落を検出する。
