# ADR-0307: style op コミット末尾を `_so(b,a)` に集約

## 状態
承認 — round50

## 背景
style 系コマンドの末尾
`if(before.length){_styleOp(before,after);invalidate()}`
が 24 箇所に散在 (ADR-0303 の _forSel と対になるコミット定型)。

## 決定
`const _so=(b,a)=>{if(b.length){_styleOp(b,a);invalidate()}}` を
globals に追加し全サイト `_so(before,after)` に置換。

## 断念した代替案
- _forSel にコミットまで含めた高階ヘルパー — before/after 構築は
  site 固有なので末尾のみを分離。

## 影響
raw ~700B。2014 全緑。
