# ADR-0465 — snapshot 応答者選出: 最小 non-asker ピア

## 状態

実装済 (v1.7.498)

## 背景

ADR-0455 で snapshot 応答を最小 id ピア限定にした際のゲート `_pi()<msg.peer&&_loResp()` は、**asker が最小 id を持つ場合に誰も応答しない飢餓**を持っていた:

- `_loResp()` は `_pr()` (asker 含む、`_touchPeer` が先に走る) に自分より小さい id がいない時のみ true
- asker の id < 自分 → `.some(k<_pi())` が asker で true → `_loResp()` = false — `_pi()<msg.peer` のゲート以前に、`_loResp` 自身が asker を数えていた
- 結果: joiner が部屋の最小 id を持つと応答者 0 人 — 初回 snapshot が届かず、joiner は空のまま (2 ピア部屋で ~50% の確率)

## 決定

`_loResp(pk)` に asker id を渡し、選出母集団から asker を除外 (`k!==pk`): 応答者 = asker 以外の最小 id ピア — **ちょうど 1 人が必ず応答**。冗長だった `_pi()<msg.peer` ゲートは撤去 (asker が小さい場合は `_loResp` が自動的に false になるため)。

## 影響

- asker は常に一意の応答者から snapshot を受ける (ピア総数によらず starvation なし)。
- 選出は決定的 — id はランダムなので「応答負荷の公平分散」にもなっている。
- 副次効果: `_pi()<msg.peer` 撤去で条件が単純化、~8B 削減。
