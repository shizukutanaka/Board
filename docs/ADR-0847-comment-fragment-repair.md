# ADR-0847 — 切断コメント残片の文法修復

## Context

過去のコメント一括刈り込み (ADR-0580/0807/0829) が各行をバイト幅で切断したため、
節の途中で終わり次行が文法的に継がない残片が残った。情報価値は残存するが
読解不能な箇所のみを選別し、橋渡し句を最小補完する。

## Change

5箇所を修復 (index.html のみ、バイト中立):

- ADR-0617 (8344): "…removed … is the same generation" → 同世代スナップショットは stale でない旨を補完
- ADR-0717 (1622): "lost on theirs … compares" → "(which" を補完
- ADR-0724 (1779): "un-paged instead … 'unpage'" → "(the" を補完
- ADR-0703 (1790): "empties our set … sender did" → "— apply it exactly as the" を補完
- ADR-0712 (1876): "diverged props. … still passes" → "The forward gate still applies" を補完

行折り返しの関数語終わり (正常な散文) と語片切断 (内容自体は残存) は対象外。
