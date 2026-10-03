# ADR-0907 — エクスポート描画ループの per-shape 隔離 + fail-fast 監査完走

## Context

round656 の監査軸: **JSON.parse / atob / DOMParser / replaceState / toBlob 系の
fail-fast ゲート網羅性** — malformed 入力で throw する API が catch 内かを全走査。

## Audit findings — clean

| 面 | サイト | 結論 |
|---|---|---|
| `JSON.parse` (`_JP`) | 7440 / 7576 / 7588 / 7621 / 8235 / 8491 / 8509 / 8635 | 全て `try{}catch{}` 内 — wire (BC 8235, RTC 8491, join 8509)、ファイル (.board 7621)、hash `#b=` (8635) 共に gated |
| `atob` | 7053 (_dioInflate) / 8509 (_b64uDec) / 8622,8629 (hash decode) / 8540 (_b64uEnc 逆方向) | 全て呼出元 try 内 |
| `DOMParser` | 6923 (.drawio) / 7343 (.svg) | parseFromString 自体は不 fail (SVG は in-try)、`parsererror` 要素で棄却 ✓ |
| `decodeURIComponent` | 8599 (`#b=`/`#s=` 解読) | try/catch → toast+hash clear (ADR-0815/0823 parity) |
| `history.replaceState` | 8586 / 8599 / 8605 / 8663 | `clearHash` 経由で try 内 — iframe sandboxed 環境の SecurityError に耐性 |
| `canvas.toBlob` | 6635 / 6666 / 6742-6743 | null callback → `exportFailed` toast、`convertToBlob` rejection → `fin(null)` 同一路経 |
| `cv.toDataURL` | 4672 (webp downscale) | same-origin dataUrl → taint なし、寸法は IMG_IMPORT_MAX_DIM clamp 済み、`'data:,'` 失敗センチネルは regex test で棄却 |

## The one defect — export render loops lack per-shape isolation

**0601** (メイン描画ループ) と **0887** (ミニマップシーン) は「1図形の drawShape 例外が
後続全図形を殺す」実害を per-shape try/catch で隔離済み。しかしエクスポート系の
3ループは隔離なしで `drawShape` を直列呼び出していた:

```js
// before — one throwing shape truncates the whole export
for(const s of shapes)drawShape(s,oc);
off.toBlob(cb,'image/png');
```

発火時の観測: PNG 生成全体が uncaught throw で死に、toBlob コールバックすら
到達しない → ユーザは「export ボタンを押したが何も起きない」無通知失敗。
(validShape は intake で通過済みでも、render-side の縁辺 — e.g. 長大文字列の
measureText 例外や圏外座標 — で throw し得る。0601 の存在自体が実在を証明。)

## Fix — `_dS` shorthand

```js
const _dS=(s,c)=>{try{drawShape(s,c)}catch(_){}};   // on the ADR-0513 shorthand line

for(const s of shapes)_dS(s,oc);   // _renderPngBlob (6634)
for(const s of shapes)_dS(s,oc);   // exportViewportPNG (6665)
for(const s of _shV())_dS(s,oc);   // copyPNG share path (6733)
```

1図形の throw はその図形だけ描画スキップ — 残り全図形が PNG に出力される
(0601/0887 parity: 欠損1図形 < エクスポート全体の喪失)。

## Pins

- `html.includes('_dS=(s,c)=>{try{drawShape(s,c)}catch(_){}}')` — isolation 本体
- `html.includes('_dS(s,oc)')` — exportPNG ctx パラメータ pin が旧呼出を検査
  していたため `_dS` 化に追従 (検証内容 = ctx 明示渡しの維持は不変)

## Notes

- Raw 帳尻: `_dS` 定義は既存 shorthand 行へ折り畳み (新行・新規コメント回避)、
  3サイトの `drawShape(s,oc)` → `_dS(s,oc)` で -18B 相殺。557,044B / 上限内 12B。
- toBlob の null コールバック (16384px 超過等) は既に `if(!bl)` → exportFailed
  toast で gated — 本修正は「描画中の同期 throw」のみを隔離。
