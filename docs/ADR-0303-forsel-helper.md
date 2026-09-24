# ADR-0303: selection apply ループを `_forSel` に集約

## 状態
承認 — round49

## 背景
style op 系コマンドの冒頭に
`for(const id of state.selection){const s=byId(id);if(!s||X)continue;`
の定形が 26 箇所に散在。

## 決定
`const _forSel=f=>{for(const id of state.selection){const s=byId(id);if(s)f(s,id)}}`
を globals に追加し、全 26 ループを `_forSel((s,id)=>{if(X)return;…})`
に変換 (ループ内トップレベル `continue` → `return`、break 使用なしを
全サイトで確認済み)。

## 断念した代替案
- _selAny 側のみで終了 — apply 側は site 固有で読みにくいと ADR-0302
  で断念したが、機械的置換が全サイトで安全 (break 0 件) と判明した
  ため実施。

## 影響
raw ~1KB 削減。2010 全緑。
