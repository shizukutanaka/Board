# ADR-0628: architecture.md へ GPU コンテキストロスト系を同期

- 状態: 実装済
- 日付: 2026-09-28

## 背景

ADR-0627 が `contextlost`/`contextrestored` 耐性を実装したが、architecture.md の
キャッシュ節は「削除系パージの不変条件」までで止まり、GPU リセットによる
横断的ワイプの存在を記していなかった。将来 GPU 裏付けのラスタキャッシュ
(オフスクリーン canvas、snapshot bitmap) を追加する開発者が `_ctxUp` の
パージ対象に含めないと、リセット後のブランク残留が再発する。

## 決定

キャッシュ不変条件の直後に GPU コンテキストロスト節を追加:

- `_ctxUp` のパージ対象 = `_penCache`/`_penCachePx`/`_inkD`/minimap `_scene`
  (GPU 裏付けのみ)
- `_penBboxCache`/`_imgCache`/`_imgPending` は CPU 側のため対象外、と明記
- 不変条件: **新規 GPU ラスタキャッシュは `_ctxUp` のパージに含めること**

## 影響

ドキュメントのみ。`_ctxUp` の契約 (preventDefault→restore、パージ→`_iv`/`_ivO`)
が設計文書上の公知不変条件となる。
