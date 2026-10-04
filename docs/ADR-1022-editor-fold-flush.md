# ADR-1022 — lifecycle flushes fold open editors first

## 背景

テキストエディタ (`_teTa`) とラベルエディタ (`_lblTa`) は **blur 時のみコミット**する
設計 (キーストローク毎の op/broadcast を避けるため)。未コミット内容は textarea の
`value` にのみ存在し、`state` には乗らない。

永続化 flush 経路は3つ:

- `visibilitychange→hidden` → `_nugEnd()` + `Persist.flushIfHidden` (モバイル主経路)
- `pagehide` → `_nugEnd()` + `Persist.flushIfHidden('hidden')` (iOS 最後の信号)
- `beforeunload` → `_nugEnd()` + dirty 時 `Persist.save()` + 確認プロンプト

## 発見した実害

3経路とも `_cxO()` (両エディタを blur→コミット畳み) を呼んでいなかった。
ブラウザが hide/unload 時に textarea の blur を発火するかはエンジン依存で、
visibilitychange ハンドラとの順序も保証されない — iOS の frozen-tab eviction
では以後何も走らない。

結果: 編集中にタブを閉じる/アプリを切り替えると

- 既存テキストの編集 → `upd` op がコミットされず doc は**編集前のテキストのまま保存**、
  ピアへも届かない = 打ち込んだ内容が記録どこにも残らない一方向喪失
- `isNew` (新規 text/sticky) → blank add は既コミット済み (ADR-0556 の up-front 設計)
  ので空白図形だけが残り、入力内容は喪失、ピア側には永久に空白図形

なお `_cxO()` は既に page switch (ADR-0684)、プレゼン突入 (ADR-0582)、hide (ADR-0569)、
エディタ二重オープン (ADR-0560) で呼ばれており、今回は flush 経路への適用漏れ。

## 決定

3ハンドラの `_nugEnd()` 直後に `_cxO()` を追加。blur commit は同期 dispatch なので
`_cxO()` 後には `_rcOp`/`_cmt`/`Store.undo` が走り dirty フラグも立つ —
`flushIfHidden`/`save()` は畳み込み済みの最終状態を保存する。

## 契約

- **dirty 判定の前に transient 入力をコミットする**: 新規の flush/保存トリガは
  対象となる全ての未コミット書込 (nudge, editor, 今後の transient state) を
  先に畳み込んでから `_dt()`/`save()` に進む。
- `_cxO()` は両エディタ共通の畳み込み入口 — 新たな blur-commit overlay が増えたら
  `_cxO()` に追加する。

テスト: visibilitychange→hidden 実経路で textarea 入力が `byId(id).text` へ
コミットされる behavioural ピン + ハンドラのソースピン (test.mjs)。
