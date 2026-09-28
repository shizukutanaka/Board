# ADR-0561: resize 時の editor overlay follow sig リセット

## 状態
実装済 (v1.7.589)

## 背景
`_teFollow`/`_lblFollow` は viewport 署名 `x,y,zoom` の変化で overlay を再配置する
が、`positionTextEditor`/`_lblAnchor` は `_cbr()` (canvas の viewport 内 rect) も
使う。window resize / fullscreen 出入り / DPR 変更では **rect だけが動き sig は不変**
のため、overlay が旧スクリーン座標に残り、次の pan/zoom までズレ続けていた。

## 決定
`resize()` に `_teVp=_lblVp=''` を追加 — sig を潰して次フレームの follow で
強制再配置させる。余分な DOM 読み (`_cbr()` を毎フレーム) は避け、既存の
「変化した時だけ再計算」設計を維持。

## 影響
- リサイズ中でも editor overlay が図形に追従し続ける
- コスト: リサイズ1回あたり sig リセット1回のみ (ホットパス不変)
