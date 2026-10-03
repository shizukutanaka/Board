# ADR-0961: held-key 共合体 第二波 — rotate/flip/lock/group/text-flags/swap + net-zero 破棄

## Status
実装済 (round710、v1.7.987)

## Context
ADR-0957 (矢印キー nudge) → 0960 (`[ ]`/`⌘⇧,/.`) で確立した `_nug` キーセッション共合体は、
history 汚染・wire 増幅・undo 1歩戻りの「held-key フラッド」3症状を、押下停止から 400ms の
trailing-edge で単一 op へ折り畳む規則として定着した。本 ADR は同型が残っていた 6 経路を
洗い出し、同一機構で閉塞する。

キーリピートはブラウザ/OS が ~30/s で発火する。キーアクセシビリティ (ft-19 の「マウスなしで
全操作」) を維持する以上、トグル/繰返し系キーは全て長押し可能であり、押下毎に1 op を
即時 commit する設計はクラスとして不完全だった。

## Audit table — held-key 到達可能な全 mutation 経路

| 経路 | キー | op 種 | 対処 |
|---|---|---|---|
| nudgeSelection / ⌥arrow | 矢印 / ⌥矢印 | move/resize | ADR-0957 済 |
| doBringForward/Back/Front | `[` `]` | zorder | ADR-0960 済 |
| fontSizeStep | ⌘⇧,/. | style | ADR-0960 済 |
| **doRotate** | `,` `.` (±15°) / ⇧R (90°) | align | 本 ADR (`dir:'rotate'`) |
| **doFlip** | ⇧H / ⇧V | align | 本 ADR (`dir:'flip'`) |
| **doLock** | ⌘⇧L | align (locked パッチ) | 本 ADR (`dir:'lock'`) |
| **toggleTextFlag** | ⌘B/⌘I/⌘U/⌘⇧X | style | 本 ADR |
| **swapFillStroke** | ⇧X | style | 本 ADR |
| **doGroup** | ⌘G | group | 本 ADR (latest gid) |
| applyStyleToSelection | 数字 0-9 (opacity) / swatch | style | 本 ADR (産出側フィルタ) |
| doUngroup | ⌘⇧G | ungroup | 冪等 — `gids.size===0` で no-op、連打無害 |
| hideSelection | ⌘⇧H(ctx) | — | `_hd` skip で冪等 |
| pasteStyle | ⌘⌥V | style | applyStyleToSelection 経由、no-change フィルタで冪等 |
| cycle* 系 (font/align/opacity/corner/fstyle) | ctx メニューのみ | style | キー未到達 (cycle 系にキーバインドなし) |

## Decision

### 1. セッションキーへ `dir` 接尾辞を追加
共合体の識別キーは `op.op + ':' + ids` だったが、rotate/flip/lock は全て op 種が
`'align'` で同一 id 集合を触るため、無印だと `,` 長押し中の ⇧H が rotate op へ
**異種マージ**される (before/after を混ぜた壊れた op)。キーを
`op.op + (op.dir ? ':'+op.dir : '') + ':' + ids + style-prop-suffix` へ拡張し、
dir 別セッションとして分離した。

### 2. 新規マージ規則
- `group`: **最初の before + 最新の gid** を保持 (押下毎に新 gid が割り当たるため、
  live state と一致するのは最新値。undo は初回押下前状態へ戻る = ungroup 相当で正しい)。
- `style`: 従来の first-seen before + latest `_oa` after に加え、**net-zero プロパティ剪定**
  — `a[p]===b[p]` なら両側から削除し、id 毎に全 prop が消えたらエントリ自体を落とす。
- else (align/resize 等): `after` を wholesale 上書きし、**before===after (JSON) なら
  セッション自体を破棄** — ⌘⇧L 2連打 (lock→unlock) や ⇧X 2連打は「何も起きなかった」
  として op 0 件で着地する。zorder の `before!==after` フィルタ (0960) の一般化。

### 3. applyStyleToSelection の no-change フィルタ
数字キー長押しや同一 swatch 再クリックは `patch` が live 値と同一になり得る。
シェイプ毎に `b[ek]!==a[ek]` を検査し、全キー不変のシェイプは before/after へ
載せない — 繰返しが before 空配列を産み `!_ln(before)` で早期 return、
**op が一切生成されない** (共合すら不要な、より強い解)。

### 4. wire 側の安全性
遅延 commit は wire 順序を保存する (pending op は常に後続 commit より先に着地 =
0957-0960 の不変条件、`_recordCommitted`/`Store.commit`/undo/redo/switchPage/
hidden/pagehide/beforeunload 全経路で flush 完備)。live mutation は既に発生済みのため
ローカル/リモート状態は最終値で一致 — 中間点の消失は 0957 で容認済の取引。
net-zero 破棄は broadcast も発生しないが、最終 state が押下前と同一なため収束上是正。

## Consequences
- ⌘⇧L 連打、`,` 長押し、⇧H/⇧V、⌘B 連打、⇧X、⌘G、数字キー長押し — 全て 1 op/セッション
  または 0 op (net-zero) へ収束。⌘Z が「操作のまとまり」単位で戻る。
- テスト更新: `state.history` を直接読む 3 サイトに `_nugEnd()` を挿入、
  doLock undo 対称性テストは各押下を flush で独立 op 化 (意図保持のまま実装へ追従)。
  doGroup のソースピンは `_nugPush` 形へ。これらは「commit が遅延される」仕様変更への
  正当な追随であり、テストを緩めたものではない。

## ピン (test.mjs)
- held `,`/`⇧R` → 1 align op、`dir:'rotate'` キー化
- ⇧H は rotate セッションへ混ざらない (dir 分離)
- ⌘⇧L×2 net-zero → 0 op
- ⌘G×2 → 1 group op、first before + latest gid
- 数字 opacity 反復 → op 追加なし (産出側フィルタ)
- ⌘B on+off → style op 0 件
