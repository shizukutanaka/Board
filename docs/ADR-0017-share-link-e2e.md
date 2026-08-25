# ADR-0017 — 共有リンクの E2E 暗号化 (AES-GCM + fragment key)

- Status: **Accepted / 実装済み (v1.7.75)**
- Date: 2026-08-15
- Context: `docs/feature-backlog.md` FT-21 · `docs/research-improvements.md` §H ·
  v1.7.71 の First-Principles 監査(誇大表記の是正)
- 出典: [Ink & Switch — *Local-first software*](https://www.inkandswitch.com/essay/local-first/)(7原則の **Privacy**) ·
  [W3C — *Secure Contexts*](https://www.w3.org/TR/secure-contexts/) ·
  [MDN — *SubtleCrypto*](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) ·
  [RFC 3986 §3.5 — Fragment](https://www.rfc-editor.org/rfc/rfc3986#section-3.5)(fragment はリクエストに含まれない)

## なぜ

`CLAUDE.md` の WHY は Board を4本柱で定義する: **単一HTML / ゼロ登録 / 完全無料 /
プライバシー(E2E 対応予定)**。4本目だけが未実装のまま残っていた。

v1.7.71 は README 比較表の「E2E 暗号化 … URL fragment key」という主張に対し、実装に
`crypto.subtle` が**1件も存在せず**共有 URL が `#b=z:<deflate+base64>` の**平文**である
ことを実証した。表記は `✗ (未実装 — 計画中)` に訂正され、Share モーダルに警告が入り、
「主張が実装を上回る」状態は解消したが、**機能そのものは残った**。本 ADR がそれを実装する。

fragment を鍵の置き場に選ぶ根拠は RFC 3986 §3.5 — **fragment はリクエストに含まれない**。
共有 URL を中継するあらゆるサーバー(短縮 URL、チャット、プロキシ、アクセスログ)は
`#` 以降を受け取らない。サーバーレスの製品で鍵を配る唯一の現実的な場所がここになる。

## 決定

### Fragment 文法

```
#b=e:<b64url(iv ‖ ciphertext)>.<b64url(rawKey)>
```

- `e:` は既存の `z:` / `j:` に続く3つ目の kind。`importFromHash` の
  `kind=enc.slice(0,2)` 分岐に1ケース足すだけで収まる。
- 区切りは **`.`**。base64url のアルファベット (`A-Za-z0-9-_`) に含まれず、
  `encodeURIComponent` でもエスケープされないため、URL が伸びずに `lastIndexOf('.')` 一発で
  分解できる。
- **AES-GCM 256bit**。b64url で 43 文字、128bit との差は 21 文字にすぎず、盤面本体(通常 KB 単位)
  に対して無視できる。短さより「なぜ 128 なのか」を毎回説明せずに済むことを採った。
- **IV は 12 バイトのランダム**を毎回生成し ciphertext の先頭に連結。リンクごとに鍵も新規生成
  するため IV 再利用の危険は元より無いが、標準構成を崩さない。
- GCM の**認証タグ**により、改竄されたリンクは復号時に例外になる(鍵不一致と同じ経路)。

### 暗号化する平文の内部形式 (compress-then-encrypt)

圧縮 → 暗号化の順(暗号文は圧縮できないため逆順は無意味)。`CompressionStream` が無い環境でも
`crypto.subtle` は使えうるので、平文の先頭に **1 バイトのフラグ**を置いて自己記述にする:

```
plaintext = [0x01] ‖ deflate-raw(utf8(JSON))    // 圧縮あり
plaintext = [0x00] ‖ utf8(JSON)                 // 圧縮なし
```

既存の `z:`/`j:` という二文字マーカーを暗号文の中に入れる案は base64 が二重になるため却下。

### 既定の挙動

- `crypto.subtle` があれば**常に暗号化**する。opt-in チェックボックスにはしない —
  privacy が製品の柱である以上、既定で無効な privacy は現状維持と同じであり、
  UI と i18n と状態が1つずつ増える対価に見合わない。
- 無ければ既存の `z:`/`j:` 平文にフォールバックし、モーダルは従来の `shareUrlWarn` を出す。
- 既存の `z:` / `j:` リンクの取り込み経路は**一切変更しない**。配布済みリンクを壊さないことは、
  永続化フォーマット変更で最優先の制約(ADR-0001 の教訓)。

### モーダルの文言を条件分岐に

`shareUrlWarn` は v1.7.71 以降**無条件**表示だった。暗号化後もこれを出し続けると、今度は逆方向に
不正確になる。`exportToUrl()` の戻り値を `{url, encrypted}` に変え、`UI.openShare` が
`shareUrlEnc`(肯定文)と `shareUrlWarn`(警告)を出し分ける。

### 取り込み失敗の区別

`importFromHash` は従来あらゆる例外を `invalidBoard` に潰していた。E2E では失敗理由が実用上分かれる:

| 状況 | メッセージ | 理由 |
|---|---|---|
| `e:` だが `.` 以降が無い / 空 | `shareKeyMissing` | チャットアプリ等での **URL 途中切れ**が最頻の実障害 |
| `subtle.decrypt` が throw | `shareKeyBad` | 鍵不一致または改竄(GCM 認証タグ) |
| `e:` だが `crypto.subtle` が無い | `shareNoCrypto` | 非セキュアコンテキストで暗号リンクを開いた |
| それ以外 | `invalidBoard`(既存) | 変更なし |

## 同時に修正した実バグ — deflate 分岐が一度も実行されていなかった

本作業でハーネスから Share を初めて**振る舞いとして**駆動したところ、`z:` 分岐が
`TypeError: Invalid state: The WritableStream is locked` で毎回落ち、
`catch` が黙って `j:`(無圧縮 base64)に落としていたことが判明した。原因は

```js
const cs=new CompressionStream('deflate-raw');
const w=cs.writable.getWriter();      // ← これが writable をロックする
const stream=blob.stream().pipeThrough(cs);   // → 常に throw
```

の `w`(**一度も使われない変数**)。`getWriter()` が `cs.writable` をロックするため、
直後の `pipeThrough` が必ず失敗する。ブラウザでも同じ仕様なので、**deflate 圧縮は
どの環境でも一度も効いていなかった**。

実測(40 図形の盤面): JSON 3,212B → deflate 446B。base64 後で **596B のはずが 4,284B**、
すなわち共有 URL は意図の **約 7.2 倍**。多くのチャット/ブラウザが持つ URL 長の実用限界を
考えると、中規模の盤面で共有が単に失敗しうる欠陥だった。`w` の行を削除して解消。

`docs/spec.md` と CHANGELOG が共有形式を「deflate-raw + base64」と記述していたのは、
**実行されないコードパスを説明していた**ことになる — v1.7.71/v1.7.72 が見つけたのと同種の
「文書が実装を上回る」事象で、今回それが**テストで駆動していない領域**から出た点が教訓。

## 代替案と却下理由

- **(a) opt-in チェックボックス** — 既定 OFF なら現状維持、既定 ON なら実質「常に暗号化」と
  同じで UI と i18n が増えるだけ。却下。
- **(b) 鍵を `&k=` の別パラメータに** — fragment 内クエリの自前パースが要る割に、
  得られるのは「将来 ciphertext をサーバーに置く」拡張余地だけ。その予定は無い(サーバーレスが柱)。
- **(c) パスフレーズ由来鍵 (PBKDF2)** — 鍵を URL から外せるが、送り手と受け手が別経路で
  パスフレーズを共有する必要があり、「リンクを送るだけ」という体験を壊す。
  scratchpad の用途(§3.9)には重すぎる。
- **(d) 128bit 鍵** — 21 文字短いだけ。上記のとおり採らない。

## 既知の限界

1. **同期経路は E2E ではない**。本 ADR のスコープは**共有リンクのみ**。WebRTC DataChannel の
   op は DTLS で転送路暗号化されるがアプリ層 E2E ではなく、BroadcastChannel は同一オリジン内。
   README の比較表はこのスコープを明示する — v1.7.71 が正した誇大表記を、別の形で再発させない。
   同期経路の E2E(`research-improvements.md` §H 本来の射程)は鍵配布・`Net` 全経路・
   スナップショットマージ・既存ピア互換が絡むため**別 ADR**として backlog に残す。
2. **鍵はリンクを持つ全員が持つ**。守れるのは「リンクを知らない第三者 —— URL を中継する
   サーバー・履歴・ログ」であって、リンクの転送経路そのものではない。平文チャットに貼れば
   鍵ごと渡る。
3. **失効・世代管理は無い**。配った後に取り消す手段が無いのはサーバーレスの帰結。
4. ~~**`file://` での可用性は未検証**~~ → **2026-08-25 に実測で解決 (v1.7.83)**。
   FT-21 は「`crypto.subtle` はセキュアコンテキスト限定で `file://` では使えない」と
   記録していた。W3C *Secure Contexts* が `file:` を *potentially trustworthy* に含めて
   いることから本 ADR は「誤りの可能性が高い」と書いたが、**それも推定でしかなかった**。
   `a11y-browser.mjs` が実 Chromium 141 に `index.html` を `file://` で読み込ませて計測:

   ```
   isSecureContext=true  crypto.subtle=true  CompressionStream=true
   ```

   **FT-21 の当該記述は誤りだった**。ダブルクリックで開いた `index.html` でも共有リンクは
   暗号化され、deflate 経路も生きている(フラグ `0x00` の非圧縮フォールバックには落ちない)。
   実行時 feature-detect は**残す** — 判明したのは「Chromium 141 の `file://` で使える」
   ことであって全ブラウザ全バージョンの保証ではなく、安全側フォールバックを削る理由には
   ならないため。この3行は `a11y-browser.mjs` の assertion として固定してあり、
   将来ブラウザ側が変えれば CI が落ちる。

## 検証

`test.mjs` のハーネスに `location` / `history` を注入し `Share` をエクスポートして、
共有経路を**初めて振る舞いとして**駆動できるようにした上で:

- 往復(暗号リンク → 復号 → shapes と docName が復元)
- **暗号文の不透明性**: 生成 URL に盤面内の既知文字列が平文でも base64 でも現れないこと
  ——「圧縮を暗号と偽っていない」ことの直接の検査(v1.7.71 が発見した状態なら落ちる)
- 鍵欠落 / 鍵不一致 / `subtle` 不在の3経路がそれぞれ固有のメッセージを出し、取り込まないこと
- 旧 `z:` / `j:` リンクの後方互換
- `subtle` 不在時のフォールバックが `encrypted:false` を返すこと
- `CompressionStream` 不在時にフラグ `0x00` で往復すること
- **deflate が実際に効いていること**(同一盤面で `z:` 経路の出力が JSON より有意に短い)——
  上記バグの回帰防止
- 暗号経路でも ADR-0004 のバックアップと可逆 `replace` op が働くこと

非空虚性は stash 法で確認する。
