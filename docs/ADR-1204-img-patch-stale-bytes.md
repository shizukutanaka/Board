# ADR-1204 — img 参照パッチ採用時の stale dataUrl 除去

- **Status**: 実装済 (round954)
- **契機**: PR #603 (ADR-0841 `_oa` 単一ゲート) に対するレビュー指摘 — 「img-only パッチが既存 dataUrl を残したまま新参照を設置し、blob 未到達時に旧画像が永久に表示される」

## 背景

ADR-1065 は「書かれた prop が勝つ」共存規則を導入した: patch が `dataUrl` を書けば `img` を落とす (bytes 優先)。しかし逆方向 — patch が `img` を新キーへ書き換えた場合の `dataUrl` 取り扱い — は未規定で、ADR-0841 の `_oa` も `!r.dataUrl` 条件下でのみ park していた (旧コードでは heal 自体が発火しない実害)。

round953 時点の `_oa` は `'img' in p` で新参照を park するため heal 経路は閉塞済みだったが、残存する設計上の非対称があった: **`img` が仲裁に勝ったにもかかわらず旧コンテンツの bytes が残り続ける** — blob 未到達時に「真の内容 B」ではなく「旧画像 A」が永続表示される幻影。

## 決定

両採用漏斗で同一規則を実行する: **img 参照が別キーへ更新された場合、旧コンテンツに対応する `dataUrl` は即座に除去する**。

1. `_oa` (全 live-patch 漏斗): `r.dataUrl&&r.img&&'img' in p&&p.img!==w` で `delete r.dataUrl` (w = assign 前の img)。同キー再書き (`p.img===w`) は対応 bytes を保持し、`'dataUrl' in p` (bytes 優先) は従来どおり img を落とす。
2. `_mergeSnapshotOp` (snapshot マージ): `imgNew` 枝で `ex.img!==oImg` のとき `delete ex.dataUrl` (`oImg` = merge 前 img)。`'@'` 接頭正規化後に比較するため実効同一キーは落とさない。

除去後は `_park` が新キーを imgq heal へ渡し、blob 到着で `dataUrl` が再具現化 (確定) — 未到達時は placeholder で「修復中」を正直に表示する。dataUrl は content-hash のローカル具現化に過ぎないため除去で情報は失われない (wire 状態は `img`)。

## 不変条件

- `img` パッチによる別キー採用は stale bytes を残さない (両漏斗)。
- 同キー img 再書きは対応 dataUrl を保持する。
- `dataUrl` パッチは従来どおり img 参照を落とす (bytes 優先、ADR-1065)。
- 新参照は bytes の有無に関わらず `_park` → imgq heal へ進む。

## ピン (test.mjs)

- ADR-1065/1204 ブロック (15 asserts): 別キー `_oa` で stale dataUrl 除去 + park + blob 到着で再具現化、同キー再書きで bytes 保持、`_mergeSnapshotOp` の imgNew 採用で stale 除去。
- ADR-1198 ソースピン: `_oa`/`imgNew` 枝の新本体を固定。
