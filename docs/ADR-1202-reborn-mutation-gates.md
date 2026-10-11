# ADR-1202 — remote-reborn メンバーへのローカル mutation 全面閉塞 (mutation-path `_rb`/`_nrb` ゲート)

- Status: accepted (implemented, v1.8.226)
- Date: 2026-10-01
- Round: 952

## Context — ソクラテス監査の結論

ADR-0964→0971→1201 で築いた `_rb` (remote-reborn) 保護チェーンは **復元系** (undo/cancel/reborn バックアップ復元) のみを覆っており、**mutation 系** は裸だった。

第一原理: 「remote がより新しい `_born` で図形を (再) 導入した以上、その図形の現在値は remote 規制域にある」。`ptr.reborn`/`_nug.reborn` に記録された id は cancel/undo で remote 側を優先復元するが、記録以降にローカルが書く値は remote 側を負かせる —— commit 時の自クロックが LWW で勝つため、peer 側の新しい書き込みを**静黙に破壊**する一方向の発散。

- Q: reborn した図形をローカルがジェスチャ中にドラッグしたら何が起きる? → A: 毎フレーム `_geoR(rsh,orig)` が remote 幾何へ stale 値を書き、pointerup の move op が remote-reborn 直後の位置で LWW 勝利 → peer の新幾何を破壊。
- Q: `_nug` producer (nudge/resize/flip/lock/rotate/style…) が reborn メンバーを含んだまま commit したら? → A: op の before/after が post-reborn 値の ±1 を運ぶ → commit は remote より新しいため、peer は stale±1 を採用。
- Q: 「マーク時のベクトル」は? → A: `_bT` が `w._born` を新しい remote 誕生で上書きした瞬間、過去のローカル書込みは既に規制外 — マーク後のすべてのローカル mutation が対象。

## Decision

**(1) マーク時の map 除去 (mark-and-remove)** — `_bT` で `ptr.down` 時に `ptr.dragStartShapes`/`ptr.gOrig`/`ptr.gAnc` から reborn id を削除。

- doMove/`_gresizeDrag`/`_grotDrag` の変異ループは orig map を走査するため、**削除 = 以後のフレームで遡って変異しない** (追加ゲートゼロ)。
- commit 側の `[...ptr.gOrig.keys()]` / `mids` フィルタも自動的に reborn を除外 — commit ベースラインにも残らない。

**(2) スカラ orig ジェスチャの `!_rb` ゲート** — resize/rotate/ebend/cbend/lblpos/way の単一対象 orig (map ではなく object 参照のため削除不能) の変異ループを `if(sh&&!_rb(sh.id))` で閉塞。

**(3) `_nug` producer の `_nrb` ゲート** — nudgeSelection/Alt+arrow/unlockedSelectionIds (zorder/group/ungroup の共通漏斗) /doFlip/doLock/doRotate/fontSizeStep/toggleTextFlag/swapFillStroke の member 導出を `!_nrb(id)` で除外。`_xFS` (フレーム子の機械的拡張) の直後に `_unrb(sel)` で再除外 — reborn フレーム子が紛れ込む経路を塞ぐ。

**(4) commit-rollback parity** — doFlip/doRotate の `before` 配列が `_unrb` 済み sel から生成されるため、undo 時にローカル側が reborn 幾何へ stale 復元しない (ローカル undo と peer forward が一致)。

## Non-issues (監査で棄却した対象)

- **`_roRe` 復元域**: すでに `gone`/`op.orig` 両パージ済み (ADR-1201) — 今回の mutation ゲートと合わせてチェーン完備。
- **map-delete で commit の `orig` が欠ける**: `doMove` は `const orig={}` を新規構築して `ptr.dragStartShapes` から残存メンバーのみ集める — 削除された id は orig/before/after に一切出現せず、commit は survivor のみ。
- **`_nugPush` 同一キーマージ**: merge は ids 配列を増やさない — `_nrb` は arm 時の導出のみ必要。
- **`op.dd` mid-run メンバー脱落**: `_ul`/`_nrb` フィルタで dead/reborn が drop し、survivor は `every(∈dupIds)` を保つ — 構造一致のため修正不要 (ピン)。
- **`_xFS` frame-children 再追加**: `_unrb(sel)` を `_xFS` 直後に走らせる — reborn フレーム子が selection 拡張で復活しない。

## Verification — pins

9 挙動 + 3 ソースピン (test.mjs):

- `_bT` で `ptr.dragStartShapes`+`gOrig` から id が消え、survivor は残る
- arm 後の `_bT` で `_nug.reborn` が立ち、2 回目の nudge が reborn メンバーへ translate しない (survivor は translate)
- `_nugEnd` の commit が `ids` に reborn を含まない (gone purge と整合)
- `_nrb`/`_unrb` ヘルパ、`_bT` の map-delete ループ、`if(sh&&!_rb(sh.id))` ゲートが存在

## Consequences

- `ptr.reborn`/`_nug.reborn` の意味が「戻り値保護」から「mutation 禁止域」へ拡張 — remote-reborn 図形は **ローカル側で読み取り専用** として扱われる。
- `state.ro` flip の残る全箇所が `_rb`/`_nrb` でカバーされ、arm 中 ro flip の発散経路は全域閉塞。
- 将来の `_nug` producer 追加時は member 導出に `!_nrb(id)` を必須化する規約 (同じ欠陥クラスへの再入口を塞ぐ)。
