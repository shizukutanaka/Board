# ADR-0981 — Listener-registration lifecycle audit

**Status**: Completed — clean.

Sweep of every `_on(el|window|document|canvas, …)` call site plus `.onclick=`/`.on*=` assignments for the *repeat-path duplication* defect class: a handler registered inside a path that runs more than once (modal open, editor creation, room re-init, per-rebuild loops) accumulates N copies → each event fires N handlers → duplicated ops / leaked observers.

## Findings

| Site family | Verdict | Reason |
|---|---|---|
| `_on(canvas, …)` 全16サイト | clean | `wire()` 内 init-time 単一実行 |
| `_on(window|document, …)` (keydown/mousedown/paste/visibilitychange/…) | clean | 全て wire()/top-level で一回のみ |
| `_on(inp|ta, …)` テキスト/ラベルエディタ | clean | 要素はエディタ生成毎に新規作成 — リスナは要素と共に GC |
| `_on(cp|rng|docNameEl, …)` スタイルパネル/docName 入力 | clean | wire() 内、照会済み永続要素へ一回のみ登録 |
| `_oC(_g('id'), f)` onclick 束縛 | clean | 照会 id 毎に唯一の束縛 (重複登録は silent replace → ピン化) |
| `_watchDPR` の matchMedia リスナ | clean | `{once:true}` 単発 + 新 mq へ再アーム (旧 mq は GC) |
| `Net.init` 再実行 | clean | 先頭で `bye` 送信 + `this.bc.close()` + `clearInterval(_presenceTimer)` — 旧チャネル/タイマを解放してから新規作成 |
| `bc.onmessage=` / `img.onload=` / `reader.onload=` | clean | インスタンス毎に単一代入、インスタンス破棄で解放 |
| Service Worker `self.addEventListener` | clean | SW グローバル — 再登録は install 時の単発 |

## Pins (test.mjs)

- Source: `_oC(_g('id'))` の id が全体で一意、`_on(window,_KD)`/`_on(document,'mousedown')` が1箇所、`_watchDPR` の `{once:true}`。
- Behavioural: `Net.init` 連続呼出で旧 BroadcastChannel の `close()` 発火・`bye` 送信・旧 `_presenceTimer` (`Timeout._destroyed`) クリア・新チャネル生成。

## Invariant

> リスナは「init 一回」または「要素と同じライフサイクル」のどちらかに属する。繰り返し経路で同一要素に再登録してはならない (`Net.init` のように旧リスナを明示解放する場合のみ許容)。
