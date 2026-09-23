# ADR-0031: 画像バイト列の永続化層分離 (content-hash blob store)

## 状態
実装済み (v1.7.89) — FT-15 のステージ1 (永続化層のみ)。ワイヤ形式
(ops / share link / .board / history) は `dataUrl` のまま不変。

## 背景
画像シェイプは `dataUrl` (base64) を保持する。1枚あたり数百KB〜数MBになる
ため、オートセーブ (debounce 500ms 毎の doc 全体 `put`) での複製コストと
IDB レコード肥大が問題だった。また `DOC_KEY` と `DOC_KEY+':prev'` (ADR-0004
バックアップ) が**同じ画像を2コピー**保持していた。

Excalidraw 系ツールの定石: 巨大なバイナリはドキュメントレコードから切り離し、
content-addressable store に置いて参照で結ぶ (Git の blob/tree と同型)。

## 決定
- **IDB v1→v2**: `imgs` オブジェクトストアを追加 (`onupgradeneeded` で
  条件付き作成)。doc レコードの `shapes[]` 内で `dataUrl.length>128` の
  画像は `{...rest, img:key}` に置き換え、バイト列は `imgs[key]=dataUrl` に分離。
- **キーは content hash**: `i<len36>x<fnv36>` — dataUrl の長さ +
  FNV-1a 32bit を base36 化。同じ画像は常に同じキー → doc と :prev は
  **1コピーを共有**し、同画像の複数シェイプも自動 dedup される。
- **衝突はチェーンで解決**: キーが既に別データを指す場合 `:1`,`:2`,… と
  決定論的に進む (`_imgNextKey`)。上書きによる破壊は構造的に不可能。
  (ハッシュは「プライベートストア内の名前」であり、セキュリティ境界ではない
  ため crypto.subtle を待たずに FNV で十分。)
- **閾値 128B**: それ以下の dataUrl はそのままインライン (blob 化のオーバーヘッドを
  払わない — 小さいアイコン/スタンプ用)。
- **GC**: `save()` 毎に、doc + :prev のどちらからも参照されない blob を
  `imgs` から削除。同一トランザクション内なので競合なし。
- **load/restoreBackup**: slim レコードを読み、`imgs.getAll()` で
  `dataUrl` を再装着してから `validShape` に通す — 以降の全コードパスは
  変更なし (live shapes は常に `dataUrl` 保持)。
- `checkBackup`/`discardBackup` は `imgs` を触らない (参照のみで所有権なし)。

## 断念した代替案
- **state 層まで分離 (full FT-15)**: live shapes も `img` 参照にして
  `getImg()` が blob store を引く設計。undo/history/ops/共有リンク全ての
  形式が変わり、リモートピアとの blob 交換プロトコルが要る — 1 PR の
  リスクを超えるため後続ステージに分離。
- **crypto.subtle.digest (SHA-256)**: async になるため `save()` の
  トランザクション中に置けない (await 中に tx が commit される)。
  FNV-1a + 衝突チェーンは同期で安全。
- **Blob オブジェクト保存 (structured clone)**: dataUrl を直接保存する方が
  変換コスト・読み戻し共に単純で、互換性も高い (file:// 環境でも動作)。

## 影響
- 書き込み: doc レコードが画像分だけ小さくなり、:prev が重複を持たない。
- 読み込み: `imgs` の `getAll` が1回増えるのみ (画像なしではスキップ)。
- ダウングレード: DB_VER=2 で開いた DB は v1 ビルドから開けない
  (VersionError) → 古いビルドで開くと空ボードに見える。**データ自体は
  残る**;新しいビルドに戻せば復元される。
