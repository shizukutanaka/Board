# ADR-0875 — ローカル生産者 bound 監査完走 (producer parity)

## Status
採用 (v1.7.901、docs のみ)

## Context
ADR-0872 が wire 取込 (intake) 側の全網羅を確定した。「ローカル入力が
wire 上限を超えた値を生産すると、ローカル受理・ピア棄却で恒久発散する」
(ADR-0797 系の欠陥クラス) の対となる生産者側 parity を本ラウンドで監査した。

## Audit matrix — 全ローカル文字列/数値入力の入口 bound

| Producer | 生産先 prop | 入口 bound | wire bound | parity |
|---|---|---|---|---|
| docName input | `docName` | `maxlength="80"` | name ≤ bound | ✓ 入力時点で打止め |
| linkPrompt | `link` | `slice(0,500)` + `^https?://` + `_wT('badUrl')` | `^https?://` ≤500 | ✓ 同じ書式+上限 |
| text editor | `text` | `ta.maxLength=5e3` (ADR-0797) | text ≤5000 | ✓ |
| label input | `label` | `maxLength=80` | label ≤600 | ✓ ローカルはより厳しい |
| `_pgRename` | page name | `_s80(_trm(n))` | name ≤80 | ✓ |
| `_selLink` | `link` | 上記 linkPrompt | 同上 | ✓ |
| fontSizeStep | `fontSize` | clamp [8,64] | (0,1e4] | ✓ |
| spacing/lineH/opacity cycles | `spacing`/`lineH`/`opacity` | 固定列挙 {null,1,2}/{null,1,1.5}/0-1 | finite/range gated | ✓ 列挙内のみ |
| `_penPr`/pts | `pts` | local pen stroke ≤50000 tuples | pts ≤50000 | ✓ |
| waypoint insert | `way` | ≤200 | way ≤200 | ✓ |
| dataUrl import | `dataUrl` | 16MB + `^data:image/` (ADR-0867) | 同上 | ✓ |
| エディタ typography トグル | `bold`/`italic`/`under`/`strike` | 真偽値 | flag whitelist | ✓ |

## Rules confirmed
- **Bound at the source**: ローカル UI は wire 上限以下の値しか生産してはならない
  (0797 修正以来の既定)。本監査で全12系統の入力がこの規則に一致。
- **緩い方が良い wire 側を超えて良いことはない**: label は wire ≤600 に対し
  ローカルは 80 — ローカル側が厳しいのは安全側 (ピアが 600 を送っても intake 受理、
  ローカルは自分では作らないだけ)。
- `prompt()` 系は全て入力側で `slice`+regex 検証 → 無効値は `_wT` 通知で棄却。

## Consequence
- 実害なし。ローカル→wire の全経路で「受理された値はピアでも受理される」が成立。
- 0872 (intake parity) + 0875 (producer parity) で検証面の両側が完走。

## Test pin
既存ピン群が producer bound を個別カバー (0797 text、0868 ranges、0795 viewport、
0486 presence ids)。ソースピン追加なし — 監査記録のみ。
