# ADR-0112: 共有リンクに作成者のビューポートを同梱

## 状態

実装済み (v1.7.170)。

## 背景

共有リンクは shapes+name のみ — 受け手は自分の現在ビュー (または
boot ガードの fit) で開くため、「この部分を見て」のウォーク
スルー用途で意図した箇所が映らない。

## 決定

- `exportToUrl` の data に `viewport:{x,y,zoom}` (小数丸め) を追加。
- `importFromHash` で `data.viewport` を数値検証
  (`Number.isFinite` + `zoom>0` + `clampZoom`) して採用 — IDB
  復元と同じゲートで、壊れた/前方非互換の zoom は state に届かない。
- 旧リンク (viewport 無し) は従来通り現在ビュー/フィットで開く。

## 断念した代替案

- **URL fragment に別パラメータ**: payload 内の方が暗号化経路
  (e: 形式) でもそのまま機能し圧縮も効く。

## 影響

- ペイロード +~40B。受け手が import 確認後に開く景色 = 送り手の
  景色。
- `_fitIfEmptyView` (ADR-0106) が boot 側の安全網として既に存在。
