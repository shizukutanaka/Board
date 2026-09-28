# ADR-0540: グローバル input Escape を IME 合成中に blur しない

- 状態: 実装済み (v1.7.568)
- 系: 修正 (i18n/IME) + 保守

## 背景

グローバル `_KD` ハンドラは `input,textarea` ターゲットで
`Escape → e.target.blur()` していた。ローカルハンドラを持つ
ラベルエディタ/テキスト編集/検索ボックスは個別に `isComposing`
をガード済みだが、グローバル経路にはガードがなく — `#docName`
(日本語名入力) や RTC offer/answer ペースト欄で IME 変換中の
Esc (変換キャンセル) が **フォーカスを奪い、2 度目の Esc でしか
編集継続できない**実害だった。

## 決定

`if(e.key==='Escape'&&!e.isComposing)e.target.blur()` —
合成中はブラウザのネイティブ変換キャンセルに委譲し blur しない。

併せてコメント尾 3 箇所を ~90B 刈り込み (6569/6328/7828)、
raw 残量 ~430B を回復。

## 影響

- 合成でない Esc の blur 挙動は不変。
- test.mjs にピン追加 (`Escape'&&!e.isComposing` 形の存在)。
