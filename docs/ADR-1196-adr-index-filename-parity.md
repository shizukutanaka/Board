# ADR-1196: ADR インデックスのファイル名 parity — 9件の rename 残存 dead link 修正 + drift ゲート

## 状態
実装済 (2026-10-01)

## 背景

CLAUDE.md の ADR ツリー節は各ラウンドが手で追記する索引であり、参照先が実在の
`docs/ADR-*.md` ファイルであることを検証する仕組みが存在しなかった。

round946 の監査で、rename/改名された ADR ファイル名が index 側に残ったままの
**dead link が 9 件**確認された (集合対称差はちょうど 9 対 9 の 1:1 対応):

| index が指していた (存在しない) | 実際のファイル |
| --- | --- |
| ADR-0391-more-literal-shorthands.md | ADR-0391-tr-ud-now-shorthands.md |
| ADR-0392-sa-al-ap-shorthands.md | ADR-0392-sa-shorthand.md |
| ADR-0393-board-viewport-roundtrip.md | ADR-0393-board-file-viewport.md |
| ADR-0394-more-dom-shorthands.md | ADR-0394-aria-const-shorthands.md |
| ADR-0397-st-pd-consts.md | ADR-0397-st-pd-toast-consts.md |
| ADR-0398-file-import-32mb-guard.md | ADR-0398-file-size-guard.md |
| ADR-0399-ap-sto-kd-ch-ck-shorthands.md | ADR-0399-more-shorthands.md |
| ADR-1047-minimap-img-ik-verify.md | ADR-1047-minimap-img-verify.md |
| ADR-1049-img-rescan-repark.md | ADR-1049-imgq-slow-rescan.md |

実害: index から辿れるはずの設計判断が「存在しないファイル名」に誘導され、
grep/ツール追跡で行き止まりになる。ADR が 1,191 件を超える今、手検証は機能しない。

## 決定

- CLAUDE.md の 9 行を実在ファイル名へ訂正。
- **drift ゲートを test.mjs に追加**: `docs/ADR-*.md` の実ファイル集合と
  CLAUDE.md が言及する `ADR-\d{4}-*.md` 参照集合の一致を毎 `node test.mjs` で検証する。
  差集合 (index→file 双方向) は存在すれば fail。

## 非対象

- ADR 以外の docs (architecture.md / spec.md / audit-*.md 等) は別の言及系統であり本節の対象外。
- ADR 本文の内容正確性はこの gate の範囲外 (ファイル存在 parity のみ)。

## ピン (test.mjs)

- index が参照する全 ADR ファイル名が `docs/` に存在する (dead-link 検出)。
- `docs/` の全 `ADR-*.md` が index に言及される (orphan ADR 検出)。
- 大文字を含むファイル名 (`ADR-0920-connClears-after-null.md` 等) も正しく対応する。
