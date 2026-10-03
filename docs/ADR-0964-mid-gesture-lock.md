# ADR-0964: ジェスチャ中リモート lock の収束 — commit ゲート + orig 復元

## 状態
採用 (実装済み, v1.7.990)

## 文脈
ピア側の forward apply は全 prop-op で `sh.locked` をゲートする:
- `upd` は両方向とも `if(sh.locked)break`
- move/style/resize/align/beautify はメンバー毎に `if(!sh||(sh.locked&&!('locked' in raw)))continue`
- `validRemotePayload` の `noLock` は patch に `locked` を含むと丸ごと棄却

このため、ローカルがポインタジェスチャ中に remote `locked` が着地すると
**ローカルだけが変形を commit し、ピアは drop する** — 一方向発散が確定する。

## 決定
発散させない選択肢は2つ:
1. commit 前に lock を検査し orig へ復元 (ピアの見えに合わせる)
2. commit してピア側も強制適用 (wire 仕様の変更が要る)

1 を採用 — 「locked 図形への書込みは全 peer で無視される」という既存の
wire 契約 (ADR-0712/0716 parity) をローカルの commit 側にも延長するだけで、
プロトコルは変わらず収束する。実装:

- **`_gRst()`**: abortGesture / `_cancelPointerGesture` に二重化していた
  per-kind 原状復元行列を共有関数へ抽出 (~1.2KB 回収)。move/resize/
  gresize+grot(+gAnc)/rotate/ebend/cbend/way/lblpos の `ptr.*Orig` を
  `_geoR` で戻して `_iv()`。副次修正: abortGesture も gAnc 復元を拾う。
- **PU commit 6サイト** (resize/rotate/cbend/ebend/way/lblpos):
  `if(sh)if(sh.locked)_gRst();   // ADR-0964` → else commit。
  `_gRst` は `_dk()` で現在のジェスチャを振り分けるので正しい orig が戻る。
- **`_gresizeCommit`/`_grotCommit`**: メンバー単位の仕分け — locked メンバーは
  `_geoR`+`_iv()` で復元し `after` から除外。`_grot` は gAnc コネクタも同型
  (復元ループを `after` 計算の前に置き、全メンバー locked でも動く)。
- **`flushErase`**: `_eraseBatch` クローンは byId fallback (ADR-0952) で
  remote `locked` が届く。`live=_eraseBatch.filter(s=>!s.locked)` に仕分けし
  del op は live のみ — locked メンバーは復帰してピアと一致。
- **move** は既に `_ul` フィルタ済み。tool ジェスチャは新規図形を産むので対象外。

## ピン (12 動作 + 3 ソース)
- 実系列 PD(se handle)→PM→remote `locked`→PU で `w===60` 復元 + op 0 件
- `_gresizeCommit` で locked メンバー復元+除外 (`after` が未ロックのみ)
- `_grotCommit` で locked gAnc コネクタ復元+除外
- `flushErase` で locked バッチメンバー生存 + del `shapes` が live のみ
- `_gRst` 配線・`locked)_gRst();   // ADR-0964` が6サイト・仕分け3式

## 関連
- ADR-0712/0716 — undo/backward の locked ゲート (本 ADR は commit 側の対称)
- ADR-0952 — `_eraseBatch` への byId fallback (lock が届く経路)
- ADR-0764/0766 — cancel 経路の原状復元規律 (`_gRst` の前身)
