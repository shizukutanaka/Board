# ADR-0575: 編集 overlay の畳み後に再描画

## 状態
実装済み (v1.7.602)

## 背景
`drawText` は編集中のシェイプの本文を描かない (overlay textarea が覆うため)。
`_teFollow` が hide/lock 遷移で overlay を畳む際 `_iv()` を呼ばなかったため、
畳まれた後も canvas には本文なしの状態が残り、別の無効化が来るまで
本文が消えたままになった (Devin Review 指摘 — lock で顕在化)。

## 決定
close パスに `_iv()` を追加。del/hide では既存の damage で重複するが無害。

## 影響
- remote lock / hide の直後に本文が正しく再描画される
