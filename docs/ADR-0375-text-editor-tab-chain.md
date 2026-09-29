# ADR-0375: テキストエディタの Tab 連鎖

## 状態
承認 — round98

## 背景
ラベルエディタ (ADR-0196) は Tab でコミット→次のラベル可能図形へ遷移する
「高速ラベリング」フローがあるが、メインのテキストエディタ (text/sticky)
には無かった — Tab はネイティブのフォーカス遷移で編集が終わるだけ。

## 決定
`openTextEditor` の keydown に `ev.key==='Tab'` を追加: 方向 (⇧Tab で
逆順) に `_sh()` を走査し、次の text/sticky (locked/hidden 除外) へ
`ta.blur()` でコミット後 `openTextEditor(nx)` で遷移、選択も移す
(ラベル版と同一パターン)。見つからなければ単にコミット。

## 影響
2045 全緑 + includes ガード追加。
