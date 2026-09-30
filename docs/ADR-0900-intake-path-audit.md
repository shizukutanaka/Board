# ADR-0900 — 取込経路監査完走 (URL/hash・ファイル・ペースト/ドロップ)

## 状態

`importFromHash` / `inviteFromHash` / 全 FileReader インポータ / `_textCascade` /
drop・paste カスケードの全ゲートを読み切り、欠損なしを確認した。**実害なし — 記録のみ。**

## 検証済みのゲート網羅

| 経路 | ゲート |
|---|---|
| `#b=` 共有リンク | decodeURIComponent try・AES-GCM 復号・deflate 展開・128MB/200k 形数上限・`validShape` フィルタ・confirm ゲート・`_vpOK`+`clampZoom` ビューポート採用・`Persist.saveBackup`+atomic swap・全出口でハッシュクリア |
| `#s=` 招待リンク | decodeURIComponent try・toast+ハッシュクリア (ADR-0823) |
| ファイル取込 (drawio/svg/exc/board/img) | 全 FileReader サイトが `_bigFile` (32MB) 事前ガード (ADR-0398) |
| 画像取込 | `_imgImportFile` 全経路 — 32MB ガード→16M dataUrl cap (ADR-0867)→`!nw\|\|!nh` 縮退ガード (ADR-0878)→2048px WebP 縮退 |
| `_textCascade` | svg→.board→excalidraw→mxfile→TSV 4000/2000→plain 4000、全分岐で長さ上限済み |
| drop ハンドラ | 拡張子 claim が `image/*` より先 — .board/.excalidraw/.drawio/.svg が画像パスへ誤導入しない |
| paste ハンドラ | svg+xml item→`importSvgText`・image item→`_imgImportFile`・text/plain→`_textCascade` |
| 各パーサ | `drawioToShapes` DIO_MAX=20000 セル・`svgToShapes` SVG_MAX_ELEMS=5000/PTS=2000・`excToShapes` EXC_MAX_ELEMS=50000/PTS=10000 — 全て `validShape` フィルタ通過 |
| `_placeCopies` | id/groupId/a/b 結合参照の全再生成 — 重複 id の byId ゴースト不可 |
| dataUrl 流入 | 全サイト 25M スライス (`_s0(href,25_000_000)`) — SVG `<image href>`・drawio `image=`・exc `files` いずれも |

## 結論

取込面は「生の外部データが図形配列へ着地する全経路」で、大きさ (ファイル/文字数/要素数/
dataUrl/座標 domain)・形状妥当性・参照整合性の3系統が揃っている。後続の欠損は
「新しい取込フォーマット追加時にこれらゲートを通さない」形でのみ発生し得る —
新規インポータは `_bigFile`+`validShape`+要素上限+dataUrl cap の4点を必須とする。
