# ADR-0018 — オフライン Service Worker を独立ファイル (`sw.js`) にする

- Status: Accepted (v1.7.85, 2026-09-01)
- 関連: CLAUDE.md「WHY / 勝利条件」、`docs/spec.md` オフライン節、ADR-0016 (a11y ミラー)

## Context — 何が起きていたか

CLAUDE.md の勝利条件は3つあり、その1つが **「オフラインで等価に動く」**。
README も比較表で「完全オフライン ✓ PWA」「初回ロード後、完全オフライン動作」と主張していた。

**この柱は、リリース以来どのブラウザでも一度も動いていなかった。**

`index.html` は SW を文字列として組み立て、Blob にして blob URL を登録していた:

```js
const bl=new Blob([sw],{type:'text/javascript'});
navigator.serviceWorker.register(URL.createObjectURL(bl)).catch(()=>{});
```

実 Chromium (Chrome/141) を localhost で走らせて計測した (2026-08-31):

```
secureContext: true
swInNavigator: true
registration after app boot: NONE
fresh blob register attempt: REJECTED: Failed to register a ServiceWorker:
  The URL protocol of the script ('blob:http://127.0.0.1:46475/d6bf...') is not supported.
controller: no
```

**Service Workers 仕様の Register アルゴリズム**は、スクリプト URL のスキームが
*potentially trustworthy* な **http(s) であること**を要求し、それ以外を
`TypeError` で拒否する。blob: も data: も対象外で、これは実装差ではなく**仕様上の帰結**。
そして `.catch(()=>{})` がその拒否を完全に黙殺していた。

修正前のビルドに対して新ハーネスを走らせると、オフライン再読込の結果はこうなる:

```
✗ the cached document is Board itself, not an error page (title: 127.0.0.1)
✗ the full UI came back offline (0 buttons)
```

`title: 127.0.0.1` は **Chrome のネットワークエラーページ**である。

### なぜ検査をすり抜けたか (これが本題)

`test.mjs` には SW を守るはずの検査が **4件**あった。全て `index.html` の本文に対する
**正規表現**だった:

| 検査 | 主張 |
|---|---|
| L52 | `caches.open(` が html に現れる |
| L58 | `serviceWorker.*register` が html に現れる |
| L400 | `caches.keys()` と `k!==C` が html に現れる |
| L626 | navigate の network-first 文字列が html に現れる |

**すべて真で、すべて緑で、すべて「コードが存在すること」しか測っていなかった。**
コードは存在した。ただ一度も**実行されなかった**だけである。

`a11y-browser.mjs` が「ソースではなく結果を見る」ために書かれたのと同じ失敗様式。
しかも `a11y-browser.mjs` は `file://` で読み込むため、`'serviceWorker' in navigator` が
**そもそも偽**で、既存のどのハーネスもこの欠陥に触れられなかった。

## Decision

**SW を独立した `sw.js` に出し、`index.html` からは任意 (optional) の兄弟ファイルとして
`register('./sw.js')` する。**

- `index.html` **単体で完全に動作する**という単一ファイル原則は維持する。
  `sw.js` を置かないホストでは 404 → HTML が返る → MIME 不一致で登録が拒否される →
  `.catch()` が拾う。**今日とまったく同じ挙動**で、エラーも出ない (新ハーネスが実証)。
- `sw.js` を併置したホストだけがオフラインを得る。**手順は「ファイルを1つ隣に置く」だけ**。
- `file://` / USB 配布は元々 SW と無関係に完全動作する (ネットワークが介在しない)。

副次的な簡約 (マスク第3段階):
- キャッシュ名を `board-v${V}` から**固定 `'board'`** へ。navigate が network-first で
  毎回 `c.put` するため、キャッシュは常に「最後に取得できた版」を保持する。
  バージョン別キャッシュ名は不要になり、`activate` の掃除ループは
  **旧 `board-v*` からの移行のためだけに**残る。

同時に発見・修正したバグ:
- `controllerchange` は `clients.claim()` により**初回インストールでも発火する**。
  無防備なリスナーは、アプリを初めて見た人に「更新されました」とトーストする。
  `navigator.serviceWorker.controller` が既に存在する場合のみリスナーを付ける。
  **登録自体が死んでいたため、このバグは今まで発現しようがなかった。**

## 却下した代替案

1. **SW を完全に削除し、オフラインの主張を取り下げる** — マスク第2段階 (削除) の純粋適用で、
   第2ファイルも増えない。却下理由: オフラインは3つの勝利条件の1つで、**製品の正体**である。
   死んでいた実装を「動く実装」に替える費用は約30行で、取り下げる損失に見合わない。
   ユーザーにも確認し、この方針が選ばれた。
2. **インライン版とファイル版を両方持つ** — 真実の源が2つになる。CLAUDE.md が
   `docs/ci-workflow.yml` について明示している規律 (「ここに検査を書くと真実の源が2つになる」)
   と同じ理由で却下。
3. **HTTP キャッシュヘッダに頼る (`Cache-Control: max-age`)** — Board は静的ホストに
   置かれる前提で、**ヘッダを制御できない配布形態が多い** (GitHub Pages、社内ファイル共有)。
   かつブラウザのキャッシュ退避は保証されず、「オフラインで等価」を約束できない。
4. **`data:` URL での登録** — blob: と同じ理由で仕様上不可能。計測以前に排除。

## 既知の限界

1. **`sw.js` を置かないホストではオフラインにならない。** これは設計上の選択であり、
   README と spec.md に**そのまま明記する**。「置けば有効」「置かなくても完全動作」。
2. **初回ロードにはネットワークが要る。** SW はキャッシュを埋めるために一度は取得が必要。
   「初回ロード後、完全オフライン」という表現は正確だが、`sw.js` 併置が前提になった。
3. **`file://` では SW は存在しない。** ただしオフライン動作には元から不要
   (ネットワークを一切使わない)。USB 配布の体験は変わらない。
4. **キャッシュ容量・退去は制御外。** ブラウザがストレージ逼迫で退去させた場合、
   次回はネットワークが必要になる。盤面データ自体は IndexedDB + `navigator.storage.persist()`
   で別途保護されており、失われるのは**アプリ本体のキャッシュだけ**で盤面ではない。

## 検証

`offline-browser.mjs` (新規、依存ゼロ、`a11y-browser.mjs` の兄弟)。
**実 Chromium × 実 http オリジン**で結果を見る:

- SW が `activated` に到達し、`scriptURL` が実ファイルで blob: でないこと
- 初回訪問で「更新されました」トーストが**出ない**こと
- リロード後に `controller` が付くこと
- **オリジンを落として**リロード → 文書がキャッシュから返り、canvas・50個のボタン・
  a11y ミラーが揃うこと (= エラーページではないこと)
- **オフラインのまま実際に図形が描ける**こと (「読み込める」ではなく「等価に動く」)
- `sw.js` **無し**のオリジンでも index.html が完全に boot し、エラーを出さないこと

**非空虚性**: `git stash push index.html` して修正前のビルドに当てると
**13件中8件が落ちる** (`title: 127.0.0.1` = Chrome のエラーページ)。

`test.mjs` 側の4件は、`index.html` の本文ではなく **`sw.js` の内容**を見るよう反転し、
併せて「blob 登録が復活していないこと」「初回ガードが両方向に効くこと」を
**実際に該当ブロックを実行して**主張する検査を追加した。

## 学び (architecture.md にも記録)

**ソースを見る検査は、結果を見る検査に負ける。**
「コードが存在すること」を4通りに言い換えても、「コードが動くこと」の証拠には1ミリも近づかない。
本プロジェクトで「文書・検査が実態を上回った」**6例目**であり、**最も重い**
(勝利条件そのものが全ブラウザで死んでいた)。
