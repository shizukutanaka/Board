# ADR-0233: 矢印ヘッド巡回への 'none' 追加

## 状態

実装済み (v1.7.290)。

## 背景

ADR-0230 で `head:'none'` が正規スタイル値として
描画可能になったが、ctx メニューの巡回
(`HEAD_STYLES`) は 'arrow/dot/open' の3値のみ —
'none' はインポート経由でしか存在し得ず、
ユーザーが能動的にヘッドを消す手段がなかった
(ヘッドを消すには line への型変換が必要だった)。

## 決定

`HEAD_STYLES` に 'none' を追加 (arrow→dot→open→
none の4巡回)。タッチデバイスも ctx メニュー経由
で到達可能。i18n ラベルの巡回表記も更新。

## 影響

- 矢印のヘッド有無が toggle 1段で制御可能に。
- `head:'none'` の矢印は excalidraw export で
  `endArrowhead:null` に正しく往復する。
