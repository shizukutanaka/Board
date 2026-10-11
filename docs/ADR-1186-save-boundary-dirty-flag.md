# ADR-1186 — セーブ境界の dirty フラグ意味論

- Status: Accepted
- Date: 2026-10-01
- Round: 936

## Context

`state.dirty` (以下 dirty) は「未書き込みの変更が存在する」を意味し、その消費者は2箇所:
- `beforeunload` — dirty なら `Persist.save()` を発火し `returnValue` で確認プロンプトを出す。
- `Persist.flushIfHidden` — `visibilitychange`/`pagehide` の hidden 経路で dirty なら debounce をキャンセルして即時 `save()`。

供給側は `Persist.schedule()` — 全変異がそこへ流れ、`_md(!0)` を立て `SAVE_DEBOUNCE` の timer で `save()` を呼ぶ。

## Finding

`save()` は **`await txDone(tx)` の成功後に `_md(!1)` を書いていた**。save は async — `_imgSlim`・prev 読出・put・txDone までの間、新たな変異が `schedule()` 経由で `_md(!0)` + 新しい `_saveT` を arm する。すると:

1. 古い save の `txDone` が `_md(!1)` で clobber → **arm 済み write が存在するのに `_dt()` が false を読む** (~500ms の窓)。
2. その窓で `beforeunload` → プロンプトなし・即時 save 呼出しなし;`flushIfHidden` → flush スキップ。
3. arm 済み timer は生き続けるので「タブが残る」限り次の save で着地するが、kill/freeze が窓内なら最新変異を失う。

また失敗時: catch が toast のみで `_md(!1)` は実行されず dirty は残る — これは正しい挙動だった (失敗→未書込みのまま)。

## Decision

`_md(!1)` を **書込み開始時** (try の先頭) へ移し、失敗時は `_md(!0)` で dirty を復元する。

- mid-save の変異は `schedule()` が `_md(!0)` を再立てる → txDone 後も dirty は真のまま → `_dt()` は常時真値。
- 失敗時は dirty を復元 → `beforeunload`/`flushIfHidden` のカバーが残る (DB が live と不整合なのは確実 → dirty は正直)。
- 早期 return (`!this.db`) は dirty 不変 — persistence 不可でも dirty が残り warn/flush が残る。

並び替えのみで新規状態はゼロ — `_md(!1)` の位置を「書込み完了」から「書込み開始」へ移しただけ。

## Alternatives

- save 完了時に「この間に arm された `_saveT` がいるか」で条件分岐 — flag の意味が scheduler 実装に絡まる;開始時 clear の方が単純。
- 何もしない — arm 済み timer が残るので実害窓は ~500ms×kill 確率で狭い。だが flag の意味論が負うのは設計上の穴 (durability 境界で嘘をつく flag) — 一方向の非対称として畳んだ。

## Pins

- `save()` 中の `Persist.schedule()` が dirty を真のまま残す (mid-write mutation survives the clear)。
- 書込み失敗が dirty を復元する (beforeunload/flush のカバーが残る)。
- 綺麗な書込みは引き続き dirty を clear する (warn/flush 抑制)。
