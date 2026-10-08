# ADR-1150: ctx メニューのフォーカス契約 — 呼出元の捕捉と条件付き復元

## 状態
実装済み (v1.8.174, round900)

## コンテキスト

ADR-1149 が ctx メニューへキーボード経路 (≣ / ⇧F10) を加えた。開けるようになった
今、ソクラテス式に次の問い: 「メニューを閉じた後、フォーカスはどこへ帰るか?」

監査の結果、ctx メニューだけが overlay のフォーカス契約に未加入だった:

- `UI._captureFocus()`/`_restoreFocus()` (ADR-0215/0982) は help ダイアログ
  (`toggleHelp`) と share モーダルが往復している。
- `openCtxMenu` は **捕捉なし** で先頭 `.ctx-item` へ `_fc`。
- `closeCtxMenu` は `dataset.open='false'` を立てるだけ — **復元なし**。
- `.ctx-menu` は `display:none` で閉じるため、ブラウザは非表示要素の
  フォーカスを `document.body` へ落とす。

結果: Esc で閉じても項目を選んでも `activeElement` は `<body>`。キーボード
ショートカットはグローバル keydown で動くので機能は失われないが、スクリーン
リーダー利用者のフォーカス文脈は完全に消失する — APG menu パターンの
「閉じたら呼出元へ戻る」が未達。

## 設計

```js
openCtxMenu(x,y,customItems){
  if(ptr.down)_cancelPointerGesture();   // ADR-0948
  const m=_g('ctx');
  if(m.dataset.open!=='true')this._captureFocus();   // closed→open 遷移のみ捕捉
  ...
  _fc(_qs(m,'.ctx-item'));
},
closeCtxMenu(){
  const m=_g('ctx');m.dataset.open='false';
  if(m.contains(_aE()))this._restoreFocus()          // メニューが握っている時だけ
},
```

### なぜ `dataset.open` ゲートか
右クリックで「開いたまま別位置で再オープン」すると、未ゲートだと
`_prevFocus` が直前の `.ctx-item` で上書きされ真の呼出元を失う。
closed→open の遷移時だけ捕捉すれば最初の呼出元が保持される。

### なぜ `contains` ゲートか
クリックハンドラは `fn(); this.closeCtxMenu()` の順 — `fn` が自分でフォーカスを
移す項目 (ctxSearch → `toggleSq` が sqinput へ `_fc`) がある。無条件 restore は
そのフォーカスを盗み戻す。「メニュー内にフォーカスが残っている時だけ戻す」が
正しい切り分け:

- キーボードで項目を実行 → フォーカスは `.ctx-item` 上 → restore。
- マウスで項目をクリック (Chrome: mousedown はボタンをフォーカスしない)
  → フォーカスはメニュー外 → skip (そもそも奪っていない)。
- `fn` が別要素へフォーカス → 外側 → skip。

### 外側クリック経路
`document mousedown` の ADR-0607 ハンドラはネイティブのフォーカス移動
(mousedown の既定動作) より先に走る。そこで restore → 既定動作が上書きする
ため害なし。キーボード経路 (Esc/Tab/Enter) だけが実際に restore を効かせる。

## 決定

- `_prevFocus` はダイアログ系と共有スロット — メニューと help が同時開放は
  dialog trap で物理非到達。共有で問題なし。
- detached な呼出元 (メニュー開放中に消えたボタン等) は既存の
  `isConnected===false ? canvas` フォールバックに載る。
- `openExportMenu` は `openCtxMenu` に委譲済みのため自動で契約加入。

## 検証

`node test.mjs` — 4408 pass / 0 fail。ピン 7 件:
ソース 2 (capture literal, contains-gated restore literal) + behavioural 5
(捕捉、再オープン保持、メニュー内フォーカスで invoker 復元、
メニュー外フォーカスは据置 = ctxSearch parity、close は依然 `open='false'`)。

## 関連

- ADR-1149 (キーボード開放経路) — 本 ADR がそのフォーカス面を完結。
- ADR-0215/0982 (focus capture/restore + detached fallback) — 既存契約。
- ADR-0607 (外側クリック close) — 経路分析済み、無害。
