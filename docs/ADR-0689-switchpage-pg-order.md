# ADR-0689: switchPage の cursorHide は curPg 移動後に送る

## Status
Accepted — round439

## Context
`sendCursorHide` の送信ペイロード `{h:1,pg:state.curPg}` — `switchPage` は `state.curPg=id` **の前に**送出していたため、ピアに届く `pg` は旧ページ。次の presence tick までピア側のアバターページ表示・follow クリックが誤ったページを指した (0670 でこの意味が実害化)。

## Decision
`_cxO()`+`_cancelPointerGesture()` の後、`curPg` 代入→`sendCursorHide()` の順へ。

## Tests
1 ピン: `state.curPg=id;Net.sendCursorHide()` の順序
