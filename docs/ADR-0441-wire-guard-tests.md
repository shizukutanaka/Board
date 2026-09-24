# ADR-0441: wire ガード系の行動テスト + architecture.md 同期

## 状態
実装済 (v1.7.476)

## 背景
ADR-0435–0438 のワイヤ/キャッシュ不変条件 (「`_psc` が `_imgPending` も
パージ」「`_sendDC` が巨大メッセージを毒キューしない」「`_fragIn` が
重複 seq を二重計数しない」「`_ptsOK` が add/upd で同一検査」
「`_wrapCache` キーに spacing」) はテストが無く、将来のリファクタで
静かに退行しうる。また architecture.md の P2P 節は断片化プロトコル
導入前 (ADR-0382/0431/0432) の記述のままだった。

## 決定
- test.mjs に 6 asserts の行動ブロック追加: `_psc` の `_imgPending`
  purge、`_sendDC` 256KiB drop と通常送信、`_opcIn` 重複 seq 非計数、
  `validShape` の非数値 p[2] 棄却、spacing 変更での wrap キャッシュ
  無効化。`_psc`/`_ptsOK` を export hook リストに追加。
- architecture.md の P2P 節にワイヤプロトコル一覧 (op/opc/snap/img
  断片・`_sendDC` 漏斗・`_imgPending` ライフサイクル) を追記し、
  キャッシュ不変条件 (`_psc` 網羅・`_wrapCache` キー構成) を明文化。

## 影響
- index.html 本体の変更ゼロ — テスト/ドキュメントのみ。
- 不変条件の退行を test.mjs が検出するようになった。
