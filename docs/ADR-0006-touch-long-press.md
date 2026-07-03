# ADR-0006 — タッチの long-press でコンテキストメニューを開く

- Status: Accepted (implemented)
- Date: 2026-07-01
- 関連: `docs/feature-triage-2026-07.md` §4 (タッチ到達不能性)、`docs/feature-backlog.md`
  FT-06

## なぜ (Context)

`docs/feature-triage-2026-07.md` の到達経路監査により、コンテキストメニューの唯一の
トリガーが `canvas.addEventListener('contextmenu', ...)` であり、long-press ハンドラが
コード中に一切存在しない(`pointerType` 判定 0 件)ことが判明した。`body`/`canvas` には
`touch-action:none` が指定されており、これはブラウザのネイティブな long-press ジェス
チャー(および、それに伴うネイティブ `contextmenu` 合成)そのものを無効化する。つまり
ネイティブイベントに頼る解決策は存在せず、JS タイマーで自前実装する以外の道がない。

結果として、整列・均等配置・全消去・複製・グループ化・z順序・フリップ・ロック・
スタイル転写など、メニュー(または メニュー+キーボード)からしか届かない操作群が
タッチ端末では事実上すべて使用不能になっている。README は「どこでも動く」PWA を
掲げているにもかかわらず、この非対称は看板と実態の乖離になっている。

## 何を (Decision)

`state.tool==='select'` かつ `e.pointerType==='touch'` の `pointerdown` で
`LONG_PRESS_MS`(500ms)のタイマーを起動する。発火時、以下をすべて満たす場合のみ
`UI.openCtxMenu(clientX,clientY)` を開く:

1. ポインタがまだ down のまま(`ptr.down===true`)
2. `ptr.dragKind` が `resize`/`rotate` ではない
3. pointerdown 時点からの移動量が `LONG_PRESS_MOVE_TOL`(10px)以内

条件を満たしたら、既存の `_cancelPointerGesture()`(v1.6.88 で「テストから直接呼べる
ように」抽出済みの関数。move/resize/rotate のロールバック、進行中の消しゴムストローク
の復元、`state.draft`/`state.marquee`/`state.guides` のクリアを行う)を呼んで進行中の
ジェスチャーを巻き戻してから `UI.openCtxMenu` を開く。新規タイマー管理は3関数に分離し、
`_cancelPointerGesture` と同じ設計方針(小さく状態依存、テストから直接呼べる)を踏襲:

- `_armLongPress(cx,cy)` — pointerdown から呼ぶ。`clientX,clientY` をクロージャで保持。
- `_longPressFire(cx,cy)` — タイマー発火時のガード判定 + キャンセル + メニュー表示。
- `_clearLongPress()` — pointerup(常に無条件で呼ぶ)、および `_cancelPointerGesture()`
  自身の冒頭(ネイティブ `pointercancel` 経路と自前の long-press 発火経路の両方から
  安全に呼ばれるように)から呼ぶ。

### select ツール限定にした理由

メニュー内の操作(全消去を除く)はすべて `state.selection` に対して働く。select ツール
では `pickOrMarquee(wp,e)` が pointerdown 時点で同期的に選択を更新する(ヒットした図形が
あれば選択・移動ドラッグ開始、無ければマーキー選択開始)ため、long-press 発火時には
「押した場所の図形」が既に正しく選択済みの状態になる。他ツール中の long-press は
UX 上の意味が曖昧(直前の select ツール使用時点の選択が stale なまま表示される)ため、
v1 ではスコープ外とした。将来 FT-07(ファイルピッカー/エクスポート UI 追加)の後、
全消去のような selection 非依存の項目に限定して他ツールへの拡張を検討してよい。

### resize/rotate ドラッグ中は抑制する理由

ハンドルの微調整は移動量が小さいまま意図的に続くことがあり、移動量の閾値チェックだけ
では「押しっぱなし」と誤判定しうる。`dragKind` で明示的に除外し、ドラッグ中の意図しない
キャンセル(ユーザーの調整中のリサイズ/回転が巻き戻される事故)を防ぐ。

### move/marquee は移動量チェックのみで十分な理由

通常のドラッグは 500ms 以内に `LONG_PRESS_MOVE_TOL` を自然に超えて移動するため、
`pointermove` 側に別途タイマーキャンセル処理を追加しなくても、発火時点の移動量チェック
だけで「押しっぱなし」と「ドラッグ中」を区別できる。ホットパスである `pointermove` に
処理を追加しない選択をした。

## 代替案 (Alternatives)

- **全ツールで long-press を有効化**: select 以外のツールでは選択状態が意味を持たず、
  メニュー内容が直前の(無関係な)選択を反映してしまう。却下(前述の理由)。
- **ネイティブ `contextmenu` 合成に依存**: iOS Safari 等は canvas 上の long-press から
  `contextmenu` を確実に発火しない。そもそも `touch-action:none` で無効化されている。
  却下。
- **`pointermove` で明示的にタイマーをキャンセル**: 発火時の移動量チェックで代替可能な
  ため不採用。ホットパスに処理を追加しない。

## 影響 (Consequences)

- 新規モジュール変数 `_longPressTimer`、新規定数 `LONG_PRESS_MS`/`LONG_PRESS_MOVE_TOL`、
  新規関数3つ。既存ハンドラへの変更は最小(pointerdown への arm 呼び出し1行、pointerup
  冒頭への clear 呼び出し1行、`_cancelPointerGesture` 冒頭への clear 呼び出し1行)。
- この1件で、整列/均等配置・全消去・複製・コピー/ペースト/切り取り/削除/全選択・
  グループ化/解除・z順序・フリップ・ロック・スタイル転写がすべてタッチ到達可能になる
  (`docs/feature-triage-2026-07.md` §4.1/4.2 の大半を解消)。
- テスト: `_longPressFire` を直接呼び出す非空虚テストで、通常発火・移動量超過での抑制・
  resize中の抑制・ポインタ離脱後の無害な no-op を固定する(実タイマーは待たない)。
