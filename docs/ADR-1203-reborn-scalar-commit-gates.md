# ADR-1203 — reborn commit ゲート (スカラ orig) + マーク寿命をジェスチャスコープへ

- Status: accepted (implemented, v1.8.227)
- Date: 2026-10-01
- Round: 953

## Context — ソクラテス監査の結論

ADR-1202 はスカラ orig ジェスチャ (resize/rotate/ebend/cbend/way/lblpos) の**変異ループ** (pointermove の毎フレーム書込み) を `!_rb` で閉塞したが、**commit サイト** (pointerup の `_rcOp`) は残存面だった。

- Q: 変異ループが閉塞された以上、commit には何が記録される? → A: `{before: stale-ptr.XOrig, after: clone(live)}`。`before` は arm 時のローカル値、`after` は remote-reborn が持ち込んだ値 — 存在しない差分。
- Q: その phantom op は害か? → A: undo の inverse wire op が `{before→live}` を全 peer へ送出し、undo 者が巻き戻すとピアの remote 幾何まで stale 値へ戻る**発散**。undo しなくても履歴は「変異した」嘘を記録する (undo 項目が増えるだけでも非対称)。
- Q: スキップは収束するか? → A: live 値は既に remote 真値 — op を書かなければ逆 op も stomp も発生せず、全 peer が remote 値で一致。

併せて発見した第2の欠陥 — **マーク寿命の非対称**: `ptr.reborn` は `_ptrReset` (cancel/abort/pinch/hidden/page-switch 経路) でのみクリアされ、正常終了した pointerup の手動フィールドクリア列 (`ptr.down=false;ptr.dragKind=null;…` ) には含まれていなかった。

- Q: 正常終了後に残ったマークは何をする? → A: 次の pointerdown が新ジェスチャを arm しても `_rb(id)` が真のまま — 変異ループも commit も dead。その図形は**一度 remote-reborn されると事実上永久にローカル編集不能** (キャンセル経路を踏むまで)。
- Q: マークは本当にジェスチャスコープか? → A: `_bT` は `ptr.down` のときにしか追加しない。ジェスチャ間の窓では追加不能で、残っているのは前ジェスチャの死骸のみ。ジェスチャ 2 の origs は live (=remote) 値から取り直されるため保護の根拠がない。

## Decision

**(1) 6 つのスカラ orig commit サイトを `!_rb` で閉塞** — resize/rotate (upd 経路: `else if(!_rb(rsh.id)){_endPointBind…_rcOp}`)、cbend/ebend/way/lblpos (style 経路: `else if(!_rb(sh.id)&&…)`)。locked の `_gRst()` 分岐と同じ `if(sh)if(sh.locked)…else if(!_rb(sh.id))` 構造 (ADR-0964 パターン拡張)。

- 「commit を書かない」は冪等収束 — remote 真値をそのまま保持、wire も undo も何も送らない。
- reborn **前**に arm されたジェスチャは従来どおり commit 可 (その前に `_bT` map-delete が走る経路は map orig のみ — スカラは arm→reborn→commit の窓のみ)。

**(2) PU 末尾に `ptr.reborn=null` を追加** — `_ptrReset` のフィールド集合と揃え、マークをジェスチャスコープへ。正常終了後の stale マークが次ジェスチャを凍結する false-positive を閉塞。

## Non-issues (監査で棄却した対象)

- **PU 末尾で未クリアの他フィールド** (`rotOrig`/`lblOrig`/`gOrig`/`gAnc`/`wayIdx`/`panning` 等): `dragKind` クリアで到達不能の死データ — 読み手なしで実害なし (reborn は `_rb()` を経由して次ジェスチャの変異に効くため性質が違う)。
- **マークの un-mark 経路 (例: ローカルがその後 commit したら解除)**: ジェスチャスコープ化で不要 — 次ジェスチャは再 arm で新規保護判定。
- **`_nug.reborn` の寿命**: nug オブジェクト自体が `_nugEnd`/`_nugLock` で完結 — ジェスチャスコープと一致、対象外。
- **PU 末尾のクリア順序**: `reborn` クリアは commit 分岐 (switch) の**後** — commit 判定が `_rb` を読む時点では生きている。先に消すと gate が死ぬ。

## Verification — pins

8 挙動 + 2 ソースピン (test.mjs): reborn mid-resize の PU で op 非記録 + remote 値保持 + マーク消滅、reborn mid-cbend で style op 非記録 + remote cbend 保持、次ジェスチャは同 id でも通常 commit (マークはジェスチャスコープ)、6 サイトの `!_rb` ゲート存在、PU 末尾の `ptr.reborn=null`。
