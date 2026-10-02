# ADR-0965: pending op 中の mid-run lock/missing — メンバー復元+除外

## 状態
採用 (実装済み, v1.7.991)

## 文脈
ADR-0964 は「ポインタジェスチャ中の remote lock」を閉塞したが、`_nug` 共合体 (ADR-0957–0961) の pending op は同クラスの残穴を残していた:

- **move コミット (endSelect)**: `mids` の `_ul` フィルタは mid-gesture に lock されたメンバーを op から外すだけで、ライブ状態を復元しない — ピアはそのメンバーへの書込をゲートで落とすので、ローカルだけ最終ドラッグ位置を持つ一方向発散。
- **pending nudge op 全般**: `_nug` ラン中に remote `locked` (またはリモート del による消滅) がメンバーに着地しても、`_nugEnd` は `op.ids`/`before`/`after`/`changes` 全リストへそのまま flush する — ピアは該当メンバー書込を drop、ローカルだけ commit が通り一方向発散。影響経路: nudge move、⌥arrow resize、`[`/`]` zorder、⌘G group、⇧H/⇧V/`,/.`/lock の align 系、style 長押し。

## 決定
### 1. `endSelect` の move commit — `_gRL` で先に復元
`const mids=...filter(...)` の前に `_gRL(ptr.dragStartShapes)` を呼び、locked メンバーを orig 復元してから `_ul` フィルタで除外。「復元 → 除外」の順でピアと同じ最終状態へ着地する。

### 2. `_nugLock(op)` — pending op の仕分け
`_nugEnd()` が `_recordCommitted` へ渡す直前に呼ぶ:

```
for each member id (op.ids || (op.before||op.changes).map(b=>b.id)):
  missing          → gone (除外のみ)
  !s.locked        → skip
  after[i].locked  → skip (その op 自身が書いた lock — remote ではない)
  locked           → run-start 復元 + gone
    move   : _geoR(s, op.orig[id])        — nudgeSelection が push 前に全員の clone を記録
    zorder : s.frac = changes[i].before
    else   : before から「触れた prop のみ」復元 (after と _JS 比較、locked/id を除く)
             b[p]===_ud → delete s[p] else s[p]=clone(b[p])
```

- **自己 lock の除外**: `dir:'lock'` の align op は自身が `after.locked=true` を書く — これを remote lock と誤認して復元対象にしない。
- **触れた prop のみ復元**: align 系 (flip/rotate) の `before` はフルクローンだが、restore は `before↔after` の差分 prop に限定 — mid-run に remote が書いた**手つかず prop** をローカル側で巻き戻さない (0766 parity)。
- **locked 自体は決して復元しない** — ロック状態の決定は LWW に従いリモートのまま保持。
- **全メンバーリストを `gone` でフィルタ** (`ids`/`before`/`after`/`changes`)。
- **空化したら commit 自体を省略** — `o.ids`/`o.after`/`o.changes` が全て空なら `_recordCommitted`+`_keepSel` を呼ばない (空 op の history 汚染と、`_keepSel` が「commit なし」の直近 history エントリへ誤って `origSel` を刻むのを防ぐ)。

### 3. ワイヤ面
`_slimOp` は `orig` も剥がす (0965 で move pending op が `orig` を持つようになった — restore 専用、wire に流さない)。move の wire は従来どおり live から `before`/`after` を再構成するので、`_nugLock` で除外されたメンバーは相手にも届かない。

## 収束性の根拠
ピアの forward apply はメンバー毎に `sh.locked` をゲートするため、「mid-run lock のメンバーはピアが書込を drop」が確定。したがって収束するのは「run-start 復元 + メンバー除外」であり、これをローカル flush 側で再現する (0964 parity — commit を止めるのではなく、ピア側最終状態と同じ値へ寄せる)。

## 検証
- behavioural: move (lock → x 復元+除外 / 消滅 → 除外 / 全員消滅 → commit 省略)、zorder (lock → `frac=before` 復元+`changes` 除外)。
- doUngroup 既存テストを 0965 の収束意味に合わせて更新 (`!ugcLive.groupId` — mid-run lock は run-start 復元が収束)。
- doLock undo 対称性テスト — 自己 lock の除外が無いと `_nugLock` が自分の op を潰す退行を捕捉済み。
- 構造回収 (重複した復元行列を `_gR1`/`_gR2`/`_gRL` へ抽出) で byte 上限内を維持。
