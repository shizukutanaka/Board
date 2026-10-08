# ADR-1151: 検索ボックスのフォーカス契約 — Esc は畳む、独立スロットで復元

## 状態
実装済み (v1.8.175, round901)

## コンテキスト

ADR-1150 で ctx メニューが overlay のフォーカス契約に加入した。同じ質問を
残存 overlay に広げるソクラテス監査: 「フォーカスを奪う可視 surface のうち、
契約未加入はどれか?」— 残りは `sqinput` (⌘F の検索ボックス) だけだった。

実害:

- `toggleSq` は開放時に `_fc(sq)+select()` で奪うが、呼出元を捕捉しない。
- グローバル keydown の input 早期リターン (`e.target.matches('input,textarea')`)
  が Esc を先に呑み、`e.target.blur()` のみ実行 — overlay ルータ (ctx → help →
  share) に届かない。
- 結果: 検索ボックスが **開いたままフォーカスだけ body へ落下** — 見えるが
  キーボードで操作不能なゴースト overlay。閉じる手段は別ジェスチャの ⌘F のみ。

## 設計

```js
// グローバル keydown の input 早期リターン:
if(e.key==='Escape'&&!e.isComposing){
  if(e.target===_g('sqinput'))toggleSq();else e.target.blur();
}
return;

let _sqPrev=null;                       // 検索ボックス専用スロット
function toggleSq(){
  const sq=_g('sqinput');if(!sq)return;
  const open=sq.style.display==='none';
  if(open)_sqPrev=_aE();
  _dsp(sq,open?'block':'none');
  if(open){if(ptr.down)_cancelPointerGesture();_fc(sq);sq.select();}
  else{_setSq('');_ivO();
    if(_aE()===sq){const p=_sqPrev;if(p&&p.focus)_fc(p.isConnected===false?canvas:p)}
    _sqPrev=null}
}
```

### なぜ専用スロット `_sqPrev` か
共有 `UI._prevFocus` はダイアログと ctx メニューが共用する 1 スロット。
検索ボックスはメニューを横断して開きっぱなしにできる (右クリで ctx を開いても
sq は残る) — その間に menu が `_prevFocus` を上書きすると、後で sq が閉じる時
復元先が消えた menu item になる。専用スロットで並立 overlay を正確に表現する。

### なぜ `_aE()===sq` ゲートか
ctx メニューの `ctxSearch` 項目は `fn()=toggleSq` を先に走らせ、
`closeCtxMenu` が後に呼ばれる順序。close 時にフォーカスが sq 上に無い場合
(別経路からの閉鎖) は復元せず、他 overlay の契約を奪わない。
(ADR-1150 の `contains` ゲートと同じ思想。)

### Esc = 畳む, not blur
find 系 palette の標準挙動 (VS Code/ブラウザの Find) — Esc は widget 自体を
畳みコンテンツへフォーカスを戻す。他の input/textarea は従来どおり blur のみ
(IME 合成中は isComposing で無効 — 既存仕様維持)。

## 決定

- Esc 経路は実リスナ経由で検証: `target===_g('sqinput')` の同一性で分岐。
- `_sqPrev` は `toggleSq` 直上の module-level let — UI object に増やさない
  (スコープ最小化)。
- 非フォーカス時の close は `_sqPrev=null` 破棄のみ — steal しない契約。

## 検証

`node test.mjs` — 4414 pass / 0 fail。ピン 6 件:
ソース 2 (Esc 分岐 literal、`_sqPrev` literal) + behavioural 4
(⌘F 開放で捕捉、Esc で畳み、invoker 復元、非フォーカス close は steal せず)。

## 関連

- ADR-1150 (ctx menu focus contract) — contains ゲート思想の親。
- ADR-0134 (find box の到達性) — 開放経路; 本 ADR はそのフォーカス面。
- ADR-0215/0982 (dialog capture/restore + detached fallback) — 同じ
  `isConnected===false ? canvas` fallback を踏襲。
