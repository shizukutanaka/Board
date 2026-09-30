# ADR-0872 — wire 取込 parity 監査完走 (op 網羅・aux・構造鍵・wholesale・生産者 parity)

## Status
採用 (v1.7.898、docs のみ)

## Context
ADR-0373..0870 が積み上げた取込検証の総仕上げ監査。「ローカル受理・ピア棄却」
発散の元を断つには、wire intake・wholesale 取込・ローカル生産者の三者が
同じゲートを共有している必要がある。

## Audit — 残存ギャップ確認

| 面 | 確認結果 |
|---|---|
| op 種別網羅 | `validRemotePayload` は `default: return false` で whitelist 済 — 未知 op は棄却 |
| op aux フィールド | `move.dx/dy` 非退化・有限、`zorder.changes` frac ≤600・id ≤64、`group.gid`/`ungroup.gids` ≤64、`pageAdd.i`/`pageDel.firstId`/`pageName.nts` 全て検証済 (0473/0485/0755/0791/0776) |
| `replace.pages`/`curPg` | 消費側 `_pgAdopt`→`_vPages` で検証 (無効時 pages:null = pre-multipage 合法状態で収束安全) |
| 構造鍵流入 | `_stripStruct` が apply 側で `type`/`id`/`_*` 鍵を除去 (0373) — `upd`/`beautify` 両経路 |
| wholesale 経路 | `.board`/共有リンク/IDB/remote `replace`/全インポータが `validShape` フィルタ通過 (0796) |
| `wc`/`afterWc` 時計マップ | `wcOk` ≤MAX_OP_SHAPES 鍵・各 prop `validClock` (0726) |
| undo-wire 反転 | `default:null` (非 wire op は undo-wire 非対象) |
| `_st()` スタイル持続化 | 書き手はローカル eyedropper (`_styleOf`) のみ — remote op は到達しない |
| ローカル生産者 parity | `fontSizeStep` [8,64]、spacing 巡回 {null,1,2}、lineH {null,1,1.5}、opacity digit 0-1 — 全て wire ゲート内 |
| peer 強制 viewport | `nav`/`follow` 型の wire メッセージは存在しない — presence は表示専用 |

## Non-adoption
なし — 監査の結論は「現行のゲート配置が全経路を覆う」。

## Consequence
wire intake の設計原則が確定: **validate at intake OR verify-safe at consume、
そのどちらかを全フィールドに適用**。今後の op/prop 追加はどちらかを
必須要件としてレビューする。
