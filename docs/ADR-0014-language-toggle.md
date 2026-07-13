# ADR-0014 — 言語手動トグル (ja/en, FT-18b)

- Status: Accepted (implemented)
- Date: 2026-07-13
- 関連: `docs/feature-backlog.md` FT-18b、ADR-0012(テーマトグル — 本 ADR はその際に
  見送った言語側の再検討)

## なぜ (Context)

ADR-0012 は FT-18(テーマ/言語トグル)のうち言語側を「`LANG`/`T` が読み込み時固定の
`const` で、生成時に一度だけ訳文をキャッシュする箇所が複数あり検証コストが高い」として
見送り、FT-18b に切り出した。本 ADR 着手にあたり実際にそのキャッシュ箇所を悉皆調査
した結果、**再検討に値するほど狭いスコープだった**ことが判明した:

- `t=k=>T[k]||I18N.en[k]||k` は呼び出しのたびに `T` を再評価する閉包 — `T` を
  `let` にして再代入すれば、`UI.toast(t(...))`・`UI.announce(...)`・
  `openCtxMenu`(開くたびに再構築)・`fillHelp`(呼べば再構築)・`applyI18n` の
  `data-t`/`data-t-aria`/`data-t-title` 走査は**追加コード無しで自動的に新言語に
  追従する**。
- 生成時に一度だけ訳文をキャッシュしていた箇所は、悉皆調査の結果 **3 箇所のみ**:
  (1) 検索ボックス(`sqinput`、初回 `⌘F` で生成後は再生成されない placeholder/
  aria-label)、(2) ヘルプグリッド(`fillHelp()` は `main()` で1回しか呼ばれず、
  モーダルの開閉では再構築されない)、(3) オンライン/オフライン表示
  (`UI.updateOnline()` は接続状態変化イベントでのみ再実行され、言語切替だけでは
  呼ばれない)。
- `LANG` 自体の直接参照は3箇所のみ(初期化2行 + `applyI18n()` 内の
  `document.documentElement.lang=LANG`)で、後者は `applyI18n()` 呼び直しで
  自動的に追従する。

つまり ADR-0012 が懸念した「漏れなく再同期する保証」は、**トグル関数の中で
上記3箇所を明示的に呼び直すだけ**で満たせる。テーマトグルより検証範囲は広いが、
「M〜L」ではなく実質「M」に収まると判断し、本 ADR で実装する。

## 何を (Decision)

### `LANG`/`T` を `const` から `let` に変更し、`toggleLang()` で再代入

```js
let LANG=(navigator.language||'en').startsWith('ja')?'ja':'en';
const LANG_KEY='board.lang';
try{const saved=localStorage.getItem(LANG_KEY);if(saved==='ja'||saved==='en')LANG=saved;}catch(_){}
let T=I18N[LANG];
```

永続化済みの言語があれば起動直後(`T` を導出する前)に上書きする。ADR-0012 のテーマ
(DOM 属性を後から設定する必要があった)と異なり、こちらは `LANG`/`T` の初期値決定
そのものに割り込むため、`main()` 側の追加の「起動時復元」呼び出しは不要 — 最初の
`UI.applyI18n()`/`UI.fillHelp()` 呼び出しから既に正しい言語になる。

### `UI.toggleLang()`: 再代入 + 3箇所の明示的な再同期

```js
UI.toggleLang(){
  LANG=LANG==='ja'?'en':'ja';
  T=I18N[LANG];
  try{localStorage.setItem(LANG_KEY,LANG)}catch(_){}
  UI.applyI18n();                 // data-t / data-t-aria / data-t-title 全走査 + <html lang>
  UI.fillHelp();                  // ヘルプグリッドは main() で1回しか呼ばれない → 再構築が必要
  UI.updateOnline();              // 接続状態ラベルは接続変化イベント待ちなので明示的に
  const sq=document.getElementById('sqinput');
  if(sq){sq.placeholder=T.k.search;sq.setAttribute('aria-label',T.k.search);}
  if(canvas.dataset.tool)canvas.setAttribute('aria-label',(T.k[canvas.dataset.tool]||canvas.dataset.tool)+' — '+t('canvasHint'));
  UI.refreshLangBtn();
  UI.announce(LANG==='ja'?'日本語':'English');   // 言語名は不変の固有名詞、キー化しない
}
```

`canvas` の aria-label は `pickTool()` 呼び出し時にしか更新されないため、ツール未切替
のまま言語だけ替えると古い言語のラベルが残る。フルの `pickTool(state.tool)` を再実行
すると SR announce が二重発火する副作用があるため、該当1行だけを複製して直接更新する。

### UI: トップバーに `btnTheme` と対の `btnLang` アイコンボタン

現在の言語そのもの(「日本語」/「English」)を `aria-label`/`title` に直接表示する
(テーマの「自動/ライト/ダーク」と同様、次にクリックした結果ではなく**現在の状態**を
示す)。

## 代替案 (Alternatives)

- **`t()`/`T` を毎回 `I18N[LANG]` から動的に引く関数に統一し `T` 変数自体を廃止**:
  却下(スコープ拡大)。`T.k.xxx` の直接参照が複数箇所にあり、全置換は本 ADR の
  範囲を超える。`let T` の再代入で十分に閉包の恩恵を受けられるため不要。
- **`fillHelp()`/`updateOnline()` を `applyI18n()` の内部から自動的に呼ぶ**: 却下。
  `applyI18n()` は「DOM の data-t 走査」という単一責任の関数として保つ方が理解しやすい。
  言語切替という複合操作の再同期手順は `toggleLang()` に閉じ込める。
- **検索ボックスを毎回破棄・再生成する設計に変える**: 却下(YAGNI)。既存の
  遅延生成+使い回しパターンを変えず、トグル時に2フィールドだけ上書きする方が
  変更が小さい。

## 影響 (Consequences)

- `const LANG`/`const T` → `let`(2箇所)。新規定数 `LANG_KEY`。新規 `UI.toggleLang()`/
  `UI.refreshLangBtn()`。
- 新規 DOM: `#btnLang`(トップバー、`btnTheme` の隣)。
- `state`/永続化フォーマットには触れない(テーマと同様、UI 設定であり盤面内容ではない)。
- テスト: `toggleLang` が (a) ja⇄en を往復する、(b) `localStorage` に永続化される、
  (c) `applyI18n`/`fillHelp`/`updateOnline` が呼ばれる(モック経由で確認)、
  (d) 検索ボックスが存在する場合のみ placeholder/aria-label を更新し存在しなければ
  安全に no-op、(e) canvas に `dataset.tool` があれば aria-label を更新する、
  (f) 起動時に永続化済み言語があれば `T`/`LANG` がそれに従う、ことを固定。
