# ADR-1162 — 総入替 import の ro 契約: 入口ゲート + 採用順序

## 状態

採用 (2026-10-01, v1.8.186)

## 文脈

ADR-1102 の paste-import カスケード監査が `_textCascade` / `importSvgText` /
`importExcText` / `importDrawioText` / `importBoardText` / `_imgImportFile` /
`_mergeImport`→`_placeCopies` に入口 ro ゲートを揃えた時点で、残るのは
**ドキュメント総入替 (wholesale swap)** の3経路のみだった:

- `importBoard` (.board ファイル)
- `importFromHash` (#b= 共有リンク)
- `Persist.restoreBackup` (:prev バックアップ復元)

これらは共通構造を持つ: `_rs` で図形を総入替 → `_pgAdopt`/docName/viewport を採用 →
`state.ro=d.ro===1` (ADR-1069: ペイロードの ro を採用) → `_repC` で 'replace' op を記録。

### ソクラテス式の確認 — 「この順序で本当に commit されるのか?」

`_repC` の先頭は `if(state.ro){_roNo();return}`。つまり **ro=1 のペイロードは
現在の doc が writable でも ro でも、常に repC を拒否させる**。採用が記録より
先に走るため、置換自体は全て落地したあとで op だけが捨てられる:

- **writable doc + ro=1 ペイロード** → swap は生效するが op が記録されない
  → **undo 不能・wire broadcast なし**。ローカルだけが他ピアと異なる盤面を
  見続け、以後の remote op が import した図形に混ざって合流する
  (franken-doc)。その盤面は `_sz` で IDB に永続化され、snapshot heal で
  ピア側へも漏洩しうる。
- **ro doc + ro=1 ペイロード** → 同上だが「read-only なのに盤面が変わった」
  というユーザー可視の矛盾を伴う (swap 生效 + `_roNo` toast + toast の
  'imported' が混在する経路もあった)。

ADR-1069 の設計意図は「doc 切替はコンテキストごと採用する」で正しいが、
採用 **タイミング** が誤っていた: ro フラグは commit 可能な状態を残したまま
記録すべきで、記録を塞いでから採用してはいけない。

## 決定

1. **入口ゲート** (3サイト同一形): swap を始める前に
   `if(state.ro&&d.ro===1){_roNo();…}` — ro doc へ ro payload の置換は
   broadcast できないため入口で拒否 (バックアップ経路はスロットを保持:
   ro 解除後に復元可能)。
2. **採用順序の反転**: `state.ro=false` を `_repC` の直前に置き
   (writable のまま commit)、`state.ro=d.ro===1;_roBadge()` を `_repC` の
   **後**へ移動。これにより:
   - writable + ro=1 → swap が 'replace' として記録・broadcast・undoable、
     その後 doc が ro に移行。
   - ro + ro=0 (writable payload) → `state.ro=false` が ADR-1069 の
     unlock-adopt と同一 (commit 後に false のまま) — 従来通り。
   - ro + ro=1 → 入口ゲートで拒否 (上記 1.)。
3. **`_mergeImport` の入口ゲート**: 兄弟イポーターと同じ
   `if(state.ro){_roNo();return}`。実害としては `_placeCopies` のゲートに
   既に到達していたが、chokepoint の入口で明示する方が契約として読める。

`Persist.load` (起動時の doc hydrate) は `state.ro=d.ro===1` を持つが、
commit 経路ではないため対象外。

## 検証

test.mjs の ADR-1069 ブロックを再校正・拡張 (28 asserts):

- (a) 不変: ro session + editable link → adopt+commit (regression)。
- (b) **反転ピン**: ro + ro:1 link → `false` 返却、swap なし、op なし、
  hash クリア (ADR-0038 parity)、readOnlyMode toast。
  旧ピンは「swap applies / records no op」= 欠陥挙動を固定していた。
- (b2) merge-mode on ro doc → `_mergeImport` が `_roNo`、配置ゼロ。
- (c) 不変: ro + ro なし file → unlock-adopt+commit。
- (c2) writable + ro:1 file → swap が commit されて **から** ro 採用
  (旧挙動は silent swap+drop)。
- (c3) ro + ro:1 file → 入口ゲートで拒否。
- (d) **反転ピン**: writable + ro:1 backup → commit 記録してから ro 採用
  (旧ピンは「adopted ro → repC drops」= 欠陥挙動を固定)。
- (d2) ro + ro:1 backup → 拒否、バックアップスロット保持。
- ソースピン 7 件: adopt-after-repC 文字列、入口ゲート 3 サイト、
  `_mergeImport` ゲート。
