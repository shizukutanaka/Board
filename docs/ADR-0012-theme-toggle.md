# ADR-0012 — テーマ手動トグル(ライト/ダーク/自動)

- Status: Accepted (implemented)
- Date: 2026-07-13
- 関連: `docs/feature-backlog.md` FT-18(v1.7.63 監査で発見)、CSS の
  `:root[data-theme=light/dark]`(v1.6 台から存在するが JS から一度も設定されず
  デッドコードだった)

## なぜ (Context)

v1.7.63 の UX/i18n 監査で「ダークモードは OS 追従のみで、`:root[data-theme=dark/light]`
セレクタは存在するのに JS が `data-theme` を設定する箇所が無く実質デッドコードだった」
ことが判明した(`docs/feature-backlog.md` FT-18)。同チケットは言語トグルも束ねていたが、
本 ADR は **テーマトグルのみをスコープにする**。

言語トグルを見送る理由: `LANG`/`T` はモジュール読み込み時に一度だけ決まる `const` で、
`t(key)` はその時点の `T` を閉包している。`t()` 自体は呼び出しのたびに `T` を再評価する
ため `const→let` にして再代入すれば大半は自動追従するが、`sq.placeholder=T.k.search` の
ように**生成時に一度だけ**訳文をキャッシュする箇所が複数あり(検索ボックス等)、
言語切替後にそれらを漏れなく再同期する保証には別途の設計と検証が要る。テーマは
CSS カスタムプロパティが `data-theme` 属性の変化に即座に反応するため対称ではなく、
リスクが小さい。言語トグルは `docs/feature-backlog.md` に FT-18b として独立記録し、
このセッションでは着手しない(CLAUDE.md「一気に全部は作らない」)。

## 何を (Decision)

### 3状態トグル: 自動 → ライト → ダーク → 自動

- 「自動」= `documentElement` に `data-theme` 属性を設定しない状態。CSS の
  `@media(prefers-color-scheme:dark)` ブロックが OS 設定に追従する(既存動作を変えない
  デフォルト)。
- 「ライト」/「ダーク」= `data-theme="light"`/`"dark"` を明示設定。既存の
  `:root[data-theme=light/dark]` セレクタ(a11y-audit-2026-07 で整備済みの
  `--accent-contrast` 分岐含む)がそのまま効く — 新規 CSS 変数追加は不要。
- 状態は `localStorage.getItem('board.theme')`(`'light'|'dark'|null`)に永続化。
  `MINIMAP_ON` と同じ「起動時に一度だけ読み、以後は明示操作でのみ変わる」パターンを踏襲。

### UI: トピックバーにアイコンボタン1個

`btnHelp` の隣に `btnTheme` を追加。クリックで3状態を循環。アイコンとラベルは現在の
**有効テーマ**(自動時は実際に適用されている方)ではなく**現在の選択状態**を示す
(「自動」であることが分かる方が「今どちらに見えているか」より重要 — 次にクリックした
ときの遷移先を予測できる)。`aria-label`/`title` は新 i18n キー `themeAuto`/`themeLight`/
`themeDark`(ja/en)を `data-t-aria`/`data-t-title` 経由でローカライズ(ADR で確立した
v1.7.63 のパターンを再利用)。

### 実装

```js
const THEME_KEY='board.theme';
function applyTheme(mode){   // mode: 'light'|'dark'|null(auto)
  if(mode)document.documentElement.dataset.theme=mode;
  else delete document.documentElement.dataset.theme;
  clearCSSCache();   // 既存: getCSS の memoize を無効化 + invalidate()(ADR-0010以前から存在)
}
UI.toggleTheme(){
  const cur=(()=>{try{return localStorage.getItem(THEME_KEY)}catch(_){return null}})();
  const next=cur===null?'light':cur==='light'?'dark':null;
  try{next?localStorage.setItem(THEME_KEY,next):localStorage.removeItem(THEME_KEY);}catch(_){}
  applyTheme(next);
  UI.refreshThemeBtn();
  UI.announce(t(next===null?'themeAuto':next==='light'?'themeLight':'themeDark'));
}
```

起動時(`main()`): 永続化済みの値があれば `applyTheme(mode)` を1回呼ぶ(既存の
`Persist.load()` 等と同じ「起動時に一度だけ」の配線に合流)。

### `--line`/`--ink` の `:root` フォールバックとの整合性確認

`:root{--line:#000;--ink:#000}` と `:root[data-theme=dark]{--line:#fff;--ink:#fff}`
(a11y-audit 由来、forced-colors 対応)は本トグルと衝突しない — 前者は
`forced-colors:active` 用のフォールバックで、後者はその中でも dark を上書きする
既存の入れ子。本 ADR は新しいセレクタを追加せず、既存の `data-theme` 属性値を
初めて JS から設定するだけなので、この階層に影響しない。

## 代替案 (Alternatives)

- **2状態(ライト/ダークのみ、自動なし)**: 却下。OS のダークモード設定を尊重する
  デフォルト動作(既存)を壊さずに上書きオプションを足すには「自動」状態が要る。
- **言語トグルも同時実装**: 却下(上記 Context 参照)。`const T`/`LANG` のアーキテクチャと
  生成時キャッシュ文字列の扱いに独自の設計論点があり、テーマより検証コストが高い。
- **ステータスバーに配置**: 却下。トピックバーの既存アイコンボタン群(Help 等)と
  同じ発見可能性を持たせるため、視認性の低いステータスバーより優先。

## 影響 (Consequences)

- 新規定数 `THEME_KEY`、新規関数 `applyTheme(mode)`、新規 `UI.toggleTheme()`/
  `UI.refreshThemeBtn()`。`main()` に起動時1呼び出し追加。
- 新規 DOM: `#btnTheme`(トピックバー)。i18n 新規キー `themeAuto`/`themeLight`/
  `themeDark`(ja/en 両方)。
- `state` は変更しない(テーマは `state` でなく DOM 属性 + localStorage — undo 対象外の
  UI 設定という点で `showMinimap` と非対称だが、`showMinimap` は描画対象の可視性という
  盤面状態の一部である一方、テーマは見た目のみで盤面の内容に影響しないため `state` に
  置く必然性がない)。
- テスト: `applyTheme` が3状態それぞれで正しい属性操作をする、`toggleTheme` が
  auto→light→dark→auto の順に循環する、localStorage 永続化(設定・削除)、
  起動時に永続化済みテーマが復元される、を固定。
