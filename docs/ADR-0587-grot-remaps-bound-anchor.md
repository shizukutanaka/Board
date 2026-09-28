# ADR-0587: grot (回転ノブ) でも aF/bF を extent へ再正規化する

## 状態

実装済 (round296)。ADR-0586 のジェスチャ経路版。

## 背景

`doRotate` (キーボード/メニュー経路) の aF リマップを ADR-0586 で実装したが、回転ノブのドラッグ (`_grotDrag`/`_grotCommit`、`_rotShape` 経由) は別の変換パイプラインを持ち、そちらでは結合コネクタのアンカーが依然未処理だった。`_rotShape` の変換は `doRotate` と同じ「中心を回転中心まわりに軌道移動 + 自転」なので、同じリマップが適用できる。

ただしドラッグは `_grotDrag` が**毎フレーム**呼ばれる点が違う — live の `aF` を逐次書き換えると、2フレーム目には変換済み値を入力にしてしまいドリフトする。したがってジェスチャ開始時にアンカーの原値を保存する必要がある。

## 決定

- `ptr.gAnc` (Map: connId → コネクタの clone) を arm 時 (単一図形・複数選択の両経路) に構築。結合先が `gOrig` に含まれるコネクタのみ対象。
- `_grotDrag` で毎フレーム、`oc` (clone) の `aF`/`bF` 原値から `p₁ = c₁ + R_deg(p₀ − c₀)` を再計算し、live extent (`_bb(live)`) へ `_c01` 正規化して書き込む — orig 基準なので再ドラッグでドリフトしない。
- `_grotCommit` で before/after にコネクタ分を同梱 (before=`ptr.gAnc` clone、after=live clone) — undo/ピア同期が成立。
- `_cancelPointerGesture` で `ptr.gAnc` から復元。リセットサイトで `ptr.gAnc=null`。

## 影響

- ドラッグ中もアンカーが結合先に追従して見える (live remap)。コミットで一括 'align/grot' op として記録・同期。
- 結合先が `gOrig` に無い (ロック/未選択) コネクタは変更なし。
- テスト: 左辺中点アンカー +90° grot で `{0.5,0}`、2フレーム目の冪等性、undo 復元を assert。
