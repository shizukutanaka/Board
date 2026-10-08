# ADR-1199 — 孤立グループ国勢調査 (`_grpSweep`: 生存メンバー ≥2 または groupId 除去)

## Context

`groupId` は識別子ではなく「**同じ gid を持つ生存図形が 2 つ以上**」という関係によってのみ意味を持つ。だがメンバーシップが 1 に減った瞬間に `groupId` を除去する経路は一切存在しなかった:

- `del` / `pageDel` メンバー強制排除 — `_bN` 生存者は `groupId` を保持
- `clear` / `replace` keep-survivor — `_bN` エスケープで全 prop 保持
- `ungroup` 部分 undo / snapshot merge での groupId LWW — 残ったメンバーが孤立
- `_placeCopies` gidMap — 単一メンバーのコピーにも新規 gid を鋳造
- リモート del / wire `group` — 適用時点で既に 1 メンバーでも `groupId` が着地

残留 groupId は実害を生む: `_grpMapGet` が単一メンバーにハロー (破線枠) を描き、`describeShape` が SR へ「(グループ)」を読み上げ、`_grpOf` ベースの全選択拡張が幻想の帰属を報告する。

## Decision

全長 grep で `groupId` 書込み面を列挙すると、メンバーシップを増減させる op は有限の 9 種 (`del`/`add`/`addMany`/`pageDel`/`pageAdd`/`clear`/`replace`/`group`/`ungroup`) に閉じることが分かった。そこで**決定論的国勢調査 `_grpSweep(C)`** を導入:

- 全生存図形を走査し gid → 生存メンバー数を数え、`count===1` のメンバーの `groupId` を `delete` + `_gTouch(id,['groupId'])` (武装中ジェスチャ orig への折込 = ジェスチャ commit が値を復活させない)
- 除去した prop は `w['groupId']=C` (op 時計) を専用 group チャネルと同じ形でスタンプ — tomb restore / `_stampWrites` と同じ時計語彙
- `_apply` 尾部で上記 9 op へのみ実行 — 他 op では図形数が変わらず結果は常に no-op なので gated で十分
- `_recordCommitted` は `_apply` を通らない (caller が先行変異する funnel)。その中でメンバーシップをインストールし得るのは `replace` (import/share/backup swap) だけなので `if(op.op==='replace')_grpSweep(op.clock)` を追加
- 描画面の防御: halo は `_grpMapGet()` のエントリを `members≥2` の場合のみ描画、persisted/wholesale 由来の orphan が op を経ずに残っても表示しない
- `describeShape` は同じ `_grpMapGet` 経由で `>1` ゲート — 「(グループ)」announce は本物のグループのみ

**収束**: スイープはオプワイヤーのフィールドを一切持たず、全ピアが同一の `_apply` 経路で同一のセンサスを実行するため emit 不要。送信側が survivor を含める/含めないに関わらず、受信側・送信側とも同じ op 後状態から同じ結論へ決定論的に着地する。

**設計判断 (ソクラテス式)**: 隠蔽・他ページのメンバーも「生存」として数える — メンバーシップは可視性ではなく同一性の問題であり、hidden 図形を含む 2 名のグループは正当。ロックされた単一メンバーも剥がす — groupId の除去は bookkeeping であり op-level ロック (内容の改変禁止) を超える意味を持たない; `ungroup` apply が unlocked のみを対象とする実害ではなく、idempotent で全ピア一致の「グループは 2 人以上」という不変条件の維持である。

## Consequences

- 単一メンバーが「グループ所属」を名乗る幻影が全発生源 (del/pageDel/swap/undo/wire/import) で閉塞
- `op.after` に orphan が含まれる wire `replace` も受信側が適用時にスイープ → 送信側 `_recordCommitted` スイープと同じ結果へ収束 (op レコードは verbatim、復元時に再スイープ)
- コストは membership 変更 op あたり O(図形数) の map 走査 — halo 用 `_grpMapGet` と同じ性質で `_gridVer` バンプ後の派生キャッシュと整合

## Verification

`test.mjs` に 9 ピン: remote del 生存者の除去 + group-channel 時計スタンプ、local commit del での除去、1メンバー wire group の不成立、2メンバー wire group の存続、`_recordCommitted` replace での swap 盤面除去、ハロー `<2` ガード、SR announce `>1` ガード、ヘルパー存在。
