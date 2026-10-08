# ADR-1189 — 画像 heal ライフサイクル契約の監査完走 (park→ask→answer→resolve→rescan)

Status: implemented (v1.8.213) — docs+pin ラウンド、コード変更なし (test.mjs に契約ピン追加のみ)

## Context

`img` 参照ヒーリングのフルライフサイクルを一巡監査した。背景: 画像 dataUrl は
content-hash 参照 (`img: <key>`) に分離され (ADR-0031)、受信側は参照のみを持つ
pending 状態から、ワイヤ上の imgq 要求→img チャンク回答→内容検証→pending 解消
へ遷移する。この遷移は 20+ ADR に分散実装されており、断片ごとにはピン済みだが
契約全体としての記録がなかった。

## 監査範囲と結論 (clean 完走)

| 局面 | 契約 | 根拠 ADR |
|------|------|----------|
| park | `_attachShape`/`_attachOp` が参照保持図形を `_imgPending` へ駐留 (256 cap、`_idOK` 二重ゲート); dataUrl 共存は書かれた prop が勝ち参照は剥がす | 0835/1078/1065/1066 |
| ask | `_imgqSweep`: 60s TTL 掃除 + 2×presence-interval 後に per-key dedup で `imgq` を `_bcast` (MAC'd 両トランスポート); `_imgRescan` が 60 sweep 毎に期限切れ live ref を再駐留 | 1064/0837/1049 |
| answer 3層 | `_imgIn` (受信) → `_imgSent` (ローカル slim) → `_imgDbGet` (IDB imgs); 10s/key throttle は miss にも適用し IDB read 率を bound | 0836/1063/1077 |
| answer 下流 | `_stgOK` 64MB stage cap → `_flushImgOuts` が 65536B チャンク化 → `_dcQ` 混雑時は `outs.slice(i)` で残りを保持し bufferedamountlow で再開 | 1062/1060 |
| chunk intake | key ≤64・data ≤96KB・n ≤4096・seq<n・slot は (key\|sender) 毎・64 slot LRU・24MB 合算/12MB per-stream・join 時ハッシュ検証 | 0781/0784/0785/0786/1038/0864 |
| resolve | join 成功で `_imgIn` へ格納 (256 entry/64MB bound) → pending の byId 解消 + sweep 解消 → `_iv()` | 0747/0629 |
| wholesale | `_pcC` purge が pending を消し `_pcR` で生存者を再駐留; `_psc` が per-shape purge を全削除経路に通す | 0985/0427 |
| persist | `_imgAttach` が load/restoreBackup で IDB heal; imgs-store 読取失敗は隔離され ref が `_imgPending` 駐留 → imgq heal | 1187/1188/0840 |

`_imgDbGet` 補助契約 (今回の追加ピン分): 参照は `_idOK` ゲート後にのみ
発行、回答は string payload のみ・`_stgOK` cap 内に限定、IDB transaction の
throw は飲み込む (consult は助言的 — 失敗が intake を塞いではいけない)。
結果の非同期 staging により `_imgOuts` への push は `rq.onsuccess` で発生し、
missing key では stage/flush とも発生しない。

## Pins

9 挙動/ソースピンを test.mjs へ追加 (async staging・persisted hit・flush・
missing key・throw 嚥下・非 id キー・cap 拒否・2 ソースピン)。
