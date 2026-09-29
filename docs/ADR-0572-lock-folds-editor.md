# ADR-0572: ロックされた図形の編集 overlay を畳む

## 状態
実装済み (v1.7.600)

## 背景
ADR-0569 は hide 遷移で overlay を畳むが、**lock 遷移は残っていた**。
remote lock (align op) や ⌘⇧L で編集中の図形がロックされると、overlay は
開いたままタイプでき、commit 時の `upd` は locked-skip で**沈黙消失**する —
入力が無駄になるだけでなく「保存された」と誤認させる。

## 決定
`_teFollow`/`_lblFollow` のプロアクティブ close ガードを `!s||_hd||_lk` に
拡張 — gone/hidden/locked のいずれでも次フレームで畳む。commit は呼ばない
(locked に対する upd はどちらにせよ捨てられるため)。

## 影響
- 「ロック済みにタイプして保存される」偽の UX が消える
- 遅延 ≤1 フレーム、reentrant commit なし
