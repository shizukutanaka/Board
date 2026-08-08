# ADR-0016 — canvas 内容の off-screen DOM ミラー (a11y)

- Status: **Accepted / 実装済み (v1.7.74)**
- Date: 2026-08-08
- Context: `docs/research-improvements.md` §I(真の残差)· `docs/spec.md` §14.3 の**唯一の P1**
  「DOM ミラー a11y」· `docs/a11y-audit-2026-07.md`
- 出典: [WHATWG HTML — *The canvas element* / fallback content](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element) ·
  [W3C WCAG 2.2 — SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html) ·
  [MDN — Keyboard accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Keyboard) ·
  [HTML `<canvas>` Accessibility (Paul J. Adam)](https://pauljadam.com/demos/canvas.html)

## なぜ (問題)

`<canvas>` のピクセルには意味論が無い。SVG と違い、描いた図形は支援技術から**構造として
存在しない**。Board はここに既に相当投資している:

- `cycleSel()` — Tab / Shift+Tab が z 順で図形を巡回
- `describeShape()` — 「Sticky "buy milk" @ 100,0」のような読み上げ文字列
- `#sr` の `aria-live` — 巡回のたびに1つ読み上げ
- canvas の `aria-label` を操作ヒントで動的更新

§3.12 が v1.6.10 で訂正したとおり、**操作は既にできる**。しかし §I が「真の残差」として
残していたのはそこではない:

> 現在は「巡回時に1つずつ読み上げる」方式で**全体の一覧性が無い**。

これは навигация(navigation)であって overview ではない。晴眼者は盤面を一瞥して
「付箋が3枚と矢印が2本ある」と分かるが、スクリーンリーダー利用者が同じことを知るには
**全図形を Tab で1つずつ通過する**しかなかった。20 図形の盤面で 20 回のキー操作と
20 回の読み上げを聞き終えて初めて、晴眼者が 0.5 秒で得る情報に追いつく。
WCAG SC 1.3.1(情報および関係性がプログラムで解釈可能であること)の観点では、
**関係性(何がいくつ、どの順で存在するか)がどこにも公開されていない**。

## 決定

canvas の外に、**常に最新の構造ミラー**を1つ置く。

```html
<div id="srMirror" role="region" aria-label="Board contents" style="…clip-path:inset(50%)…">
  <p id="srMirrorSummary"></p>
  <ul id="srMirrorList"></ul>
</div>
```

- **`boardOutline()`(純粋関数)** — `state` を読み、`{summary, items, truncated, total}` を返す。
  DOM に触らないので、面白い部分(順序・選択・件数・ローカライズ・上限)はブラウザ無しで
  テストできる。項目の文言は `describeShape()` を**そのまま**使う — ミラーと `aria-live` が
  同じ語彙を話すことで、「一覧で読んだもの」と「Tab で辿り着くもの」が一致する。
- **`UI.refreshMirror()`(薄い writer)** — `<li>` を `textContent` で組み立てる
  (`innerHTML` 禁止: 図形テキストはユーザー入力)。選択中の項目に `aria-current="true"`。
- **駆動は `frame()` からのデバウンス** — 図形と選択は 40 箇所以上で変わるが、
  変わればかならず `invalidate()` する。ADR-0011 のプレゼンス送信と同じ着眼点で
  `frame()` に1箇所だけ足し、`SR_MIRROR_DEBOUNCE`(250ms)で間引く。
  ブラウズモードの構造に必要なのは**最新であること**で、フレーム精度ではない。
- **canvas に `aria-describedby="srMirrorSummary"`** — canvas にフォーカスした時点で
  「12 Shapes: Rectangle 5, Sticky 3」と分かる。一覧は browse mode で1ジャンプ先。

### 意図的に「しなかった」こと(これがこの設計の本体)

| しないこと | 理由 |
|---|---|
| `aria-live` を付けない | 編集のたびに盤面全体を読み上げ、**無いより悪くなる**。読み上げは既存の `#sr` の役割。 |
| フォーカス可能要素を置かない | 200 個の `<button>` は Tab 順を破壊する。ミラーは**読むため**の構造で、操作導線は既存の Tab 巡回。 |
| `display:none` / `visibility:hidden` を使わない | どちらも支援技術からも消える。`clip-path:inset(50%)` の visually-hidden イディオムを既存の `#sr` と揃える。 |
| `role="application"` の内側に置かない | application ロールはブラウズモードを抑止する。ミラーは canvas の**外**に置いてこそ読める。 |
| 上限を黙って切らない | `SR_MIRROR_MAX=200` を超えた分は「ほか N 個は一覧に含まれていません」と**明示**し、summary は常に**盤面全体**を数える。 |

## 代替案と却下理由

- **(a) canvas のフォールバック内容(子 DOM)としてミラーを置く** — HTML 仕様が想定する
  正攻法で、`drawFocusIfNeeded()` と組み合わせればフォーカスリング位置まで AT に渡せる。
  却下理由は2つ: canvas 子 DOM の公開はブラウザ / AT の組み合わせで挙動差が大きく、
  **このセッションでは実機検証ができない**(`docs/feature-backlog.md` FT-11 と同じ制約)。
  加えて Board の canvas は `role="application"` を持ち、その内側はブラウズモードで
  読めない — 一覧性という当の目的を果たせない。仕様準拠より**確実に読めること**を採った。
- **(b) `role="listbox"` + `option` の本物のウィジェットにして、選択・ジャンプまで担わせる** —
  一覧から直接その図形へ飛べるのは魅力的だが、listbox のキーボード規約(矢印・Home/End・
  型入力)を実装する必要があり、既存の Tab 巡回と**2つ目の操作モデル**が併存する。
  まず「読めること」だけを最小コストで満たし、操作は既存経路に一本化した。
  将来ミラーからのジャンプを足すなら別 ADR。
- **(c) canvas をやめて SVG で描く** — 意味論は無料で手に入るが、ペン描画のパフォーマンスと
  単一HTMLの単純さを失う。製品の前提を覆す規模なので却下。

## 既知の限界

- **実スクリーンリーダーでの検証は未実施**(FT-11)。本 ADR が保証できるのは
  「正しいマークアップと正しい内容が、正しいタイミングで DOM に存在すること」までで、
  NVDA / VoiceOver が実際にどう読むかは実機確認が要る。過大に主張しない。
- **200 図形を超える盤面では一覧が打ち切られる**。summary は全体を数えるので
  「大きな盤面である」ことは伝わるが、201 番目以降の個別内容は読めない。
  それ以上は一覧という形式自体が機能しない、という判断(必要ならフレーム単位の
  階層化が次の一手)。
- **図形の空間的な関係(重なり・近接・グループの入れ子)は表現していない**。
  一覧は z 順のフラットな列で、`groupId` や frame の親子は反映しない。
  §I が言う「ランドマークで構造ナビゲーション」の完全形には届いていない。
- **250ms のデバウンス**があるため、編集直後の一瞬はミラーが古い。`aria-live` ではないので
  利用者が読みに行くタイミングでは常に最新、という前提に立っている。

## 検証

- 振る舞い(`test.mjs`、純粋関数 + スタブ DOM): 空盤面が無言にならないこと、
  一覧が z 順(= Tab の巡回順)であること、項目文言が `describeShape` と一致すること、
  選択が項目と summary の両方に出ること、上限超過が `truncated` として**明示**され
  summary は全体を数え続けること、ja でも英語が残らないこと、
  `refreshMirror` が**追記ではなく置換**すること(追記だと盤面を何度も読み上げる羽目になる)、
  同一内容の再実行が no-op であること、古い `aria-current` が再構築後に残らないこと。
- プレゼンス検査3件: リージョンの存在とローカライズ、visually-hidden であって
  `display:none`/`aria-hidden`/tabindex/`aria-live`/`<button>` を**持たない**こと、
  `frame()` からのデバウンス駆動と `textContent` 構築であること。
- 非空虚性は stash 法で確認済み — v1.7.73 の `index.html` に対して全件失敗する。
