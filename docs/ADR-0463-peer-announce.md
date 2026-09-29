# ADR-0463 — ピア参加/退出の SR アナウンス

## 状態

実装済 (v1.7.496)

## 背景

`_onConnChange` → `UI.refreshPeers()` は avatar stack を更新するが aria-live 経路を持たないため、ピアの参加/退出がスクリーンリーダーから完全に不可視だった。ピアカーソルの出現 (ADR-0010) ・選択ハイライト (ADR-0011) は視覚情報のみで、WCAG の情報パリティ (ADR-0037/0414 の announce 系と同じ隙間) に欠けていた。

## 決定

`Net._onConnChange` で `_pr().size` の増減を追跡 (`Net._pCt`) し、変化時に `UI.announce(t('peerJoined'|'peerLeft'))`。join 経路は `hello`/`cursor`/`name`/`sel`・RTC onopen、leave は `bye`・15 秒 reap・dc.onclose — すべて `_onConnChange` を通るため 1 箇所のフックで全網羅。

## 影響

- SR ユーザにピア出入りが通知される (カウント変化のみ、peer id や name は含まない — id はランダム nonce、name は後続 msg で届くため)。
- toast ではなく `UI.announce` (polite live region) — 視覚 UI を汚さない。
