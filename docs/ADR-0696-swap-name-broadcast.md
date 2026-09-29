# ADR-0696: docName を変える swap 経路は name を即時 broadcast

## Status
Accepted — round446

## Context
`name` メッセージは `_commitDocName` (入力欄) でしか送出されていなかった。
board を丸ごと入れ替えて `docName` が変わる経路 — `.board`/.excalidraw/.drawio
import、`#s=` hash、backup restore — はピアへ即座に伝わらず、次の rename/snapshot
までピア側に旧名が残った。

## Decision
`_bName()` helper ({name,ts:_nameTs=nowTs()} broadcast) を切出し、`_commitDocName`
を含む全6サイトで共有。LWW ts を bump するため遅れて届く古い rename とも
正しく順序付く。

## Tests
1 assert: `_bName()` 呼出が 6+ サイト存在
