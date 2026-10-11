# ADR-1149 — Context menu keyboard reachability (ContextMenu key / ⇧F10)

## 問題 (round899 — Socratic/到達性監査)

ADR-0135/1108/1147 は「キーボード専用 op を ctx メニューへ到達させる」方向を閉塞してきたが、
逆方向 — **メニュー自体へのキーボード経路** — が抜けていた:

- ctx メニューの入口は `contextmenu` イベント (右クリック) とタッチ long-press のみ。
- OS 標準のキーボード開放ジェスチャ (Windows `ContextMenu` キー ≣、および `⇧F10`) は
  global keydown チェーンで一切ハンドルされていなかった。
- 結果: キーボード専用ユーザーはポインタデバイスなしでコンテキストメニューを開けない。
  ADR-1147 でメニューへ届くようにした op 群 (⌘B/I/U/⇧X、⇧2 等) も、キーのみの環境では
  依然メニュー外のショートカット頼みだった。

## 設計

```js
else if(k==='contextmenu'||(k==='f10'&&_sK(e))){_pd(e);ctxMenuKbd()}
```

`ctxMenuKbd()`:

- 選択あり → `_bA(_selShapes())` の union bbox 中心を `_w2` (world→canvas) へ投影し、
  `UI.openCtxMenu(r.left+c.x, r.top+c.y)` で開く — メニューは「操作対象」に anchoring される。
- 選択なし → キャンバス中心 `(r.left+r.width/2, r.top+r.height/2)` — ボードレベル項目
  (ペースト/インポート/エクスポート) の自然な置き場。
- 引数は openCtxMenu の既存の **client 座標**規約 (内部で `_s2` → `m._wx/_wy` world anchor、
  ADR-0103 の paste-at-cursor が正しく動く)。

## ゲートの設計根拠

- `e.repeat`: 'contextmenu'/'f10' は ADR-1007 の連打許可リスト外 → 長押しリピートは抑止。
  メニューの再オープン爆発を防ぐ。
- `_pA()` (プレゼン): チェーン先頭の early return が吸収 — view-only 中は発火しない
  (contextmenu mouse ハンドラと同契約)。
- `ptr.down` mid-gesture: openCtxMenu 自身が `_cancelPointerGesture()` (ADR-0948) — mouse
  path が cancel-only なのに対しキーボードは「ジェスチャを畳んでメニューを開く」。
  キーボードにポインタジェスチャは論理上あり得ないため、こちらが正しい。
- モーダル (`help`/`share`): `_openDialog()` トラップが先に return — メニューは開かない。
- `e.target.matches('input,textarea')`: 入力フォーカス中は早退 (ContextMenu キーは OS が
  フォーム上でも発火するため、エディタ内でキャンバスメニューが暴発しない)。

## ヘルプ行

`['≣ / ⇧F10 / long press', t('ctxMenuKey')]` — 3 つの入口 (keyboard / touch / 右クリックは
自明) を1行に集約。ctxMenuKey i18n キー (ADR-1148) を再利用。

## 決定事項 / 棄却事項

- `ctxOpen` 専用メニュー項目は **不要** — メニューを開く行為自体なので。
- Menu キーの browser 差分: `e.key==='ContextMenu'` は UI Events 標準; ⇧F10 を並列で
  カバーし macOS/ブラウザの非発火環境も救済 (両方バインドするのが ARIA/プラットフォーム慣行)。
- 試験: 実 keydown dispatch (fakeWin._L) で `dataset.open==='true'` と `m._wx/_wy` の
  world アンカー (選択中心 / キャンバス中心) を両経路でピン。

## 検証

- `node test.mjs` — 4391 → 4401 (10 新規ピン: 5 source + 5 behavioural)。
- raw 551,329 B (緩い天井 557,056 B まで ~5.7KB)。
