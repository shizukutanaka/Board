# ADR-0536: `_trm` のメソッド誤用修正 — RTC 接続/応答ボタンが投げるバグ

- 状態: 実装済み (v1.7.565)
- 系: Wire / リグレッション修正

## 背景

ADR-0508 で `.trim()` を自由関数 `_trm(x)=>x.trim()` に畳み込んだ際、
2 サイトで**受け側呼び出し**に誤変換されていた:

```js
const a=_g('rtcAnswerIn')._trm(value);   // ← el._trm は存在しない → TypeError
const o=_g('rtcOfferIn')._trm(value);
```

`._trm(value)` は DOM 要素上に存在しないメソッド呼び出しであり、
クリック時に TypeError が投げられて `a`/`o` 代入に到達しない。
結果として **RTC の「接続」ボタンと「応答作成」ボタンが完全に動作不能**
(ハンドラ先頭で async 関数が reject → 静寂失敗) だった。
手動シグナリング経路の二本が両方折れていたため実害は大きい。

## 決定

`_trm(el.value)` の正しい自由関数形に修正:

```js
const a=_trm(_g('rtcAnswerIn').value);
const o=_trm(_g('rtcOfferIn').value);
```

併せて同一クラス (helper をメソッド形で誤呼ぶ) の監査を実施:
`._send`/`._chg`/`._pk`/`._pr` は正規の Net/Store メソッド、
`..._qsa(`/`{..._vp()}` 等は spread 前置で誤検出 — 他に誤用なし。

test.mjs に回帰ピンを追加: post-fold リテラル両方 +
`!html.includes('._trm(')` の否定形で再発を遮断。

## 影響

- 機能: 手動 WebRTC シグナリングの Connect/Accept 経路が復旧。
- サイズ: ±0B。
- 教訓: 自由関数 fold で「レシーバ→第1引数」移動を行う際、
  `recv.prop.method(arg)` 形を `recv._helper(arg)` と書き換えるのは誤り。
  今後の fold 規約に「`_helper` をメソッド形 `._x(` で出力しない」を追加。
