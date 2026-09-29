# ADR-0680: 選択プレゼンスの dedup キーに curPg

## Status
Accepted — round430

## Context
`sendSelectionIfChanged` の dedup キーは `ids.join(',')` のみ — ページ切替で選択が不変 (例: 両ページで空選択) だと presence が再送されず、ピア側の自 `p.pg` が旧ページのまま残る。pg は avatar-follow (0670)・ツールチップのページ名 (0656)・sel outline スコープ (0647) に使うため stale は実害。

## Decision
キーを `ids.join(',')+'|'+(state.curPg||'')` — ページ変更で必ず再送。

## Tests
1 ピン: キー式の存在
