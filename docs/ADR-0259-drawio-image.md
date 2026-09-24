# ADR-0259: drawio shape=image ↔ 画像シェイプ往復

## 状態
承認 — round38

## 背景
画像シェイプは drawio export でプレーン rect に落ち、ビットマップが
失われていた。drawio は `shape=image;image=<url>` で画像を表現し、
data URL も受け付ける。

## 決定
- export: `s.dataUrl` 付き image → `shape=image;` + `image=<dataUrl>`
  を **style 末尾**に追加。data URL は `;base64,` を内包するため、
  末尾以外に置くと後続キーが `_dioSty` の `;` 分割で壊れる。
- import: `sty.shape==='image'` の頂点で **raw style 文字列**から
  `image=(data:[^;]*;base64,[^;]*|https?:[^;]*)` を抽出 (_dioSty 経由
  では data URL が分断されるため)。`dataUrl` 25M 上限は他経路と同じ。

## 断念した代替案
- _dioSty の分割規則変更 — 他キーへの影響範囲が広く、局所 regex の方が安全。

## 影響
画像が drawio 往復で保持。http(s) URL 画像も取り込める (描画は既存の
getImg 経路)。1968 全緑。
