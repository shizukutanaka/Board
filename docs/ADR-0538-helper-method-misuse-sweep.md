# ADR-0538: helper メソッド誤用の総当たりガード (test.mjs)

- 状態: 実装済み (v1.7.566)
- 系: テスト / リグレッション防止

## 背景

ADR-0536 で `_g('rtcAnswerIn')._trm(value)` という**存在しないメソッド
呼び出し**が main に混入していた事案を修正した。自由関数化した helper を
`recv._helper(arg)` 形で呼ぶ誤りは目視では検出しにくく、今後も fold が
続く限り再発リスクがある。

## 決定

test.mjs に総当たりスイープを追加:

```js
// index.html 内で宣言された _name 集合 (const/let/var/function + const chain)
const names=new Set([...html.matchAll(/(?:const |,|let |var |function )\s*(_[a-zA-Z]\w{1,4})[= (]/g)]...);
// `recv._name(` 形の呼び出しを走査。レシーバをドットから逆方向に抽出し:
//   - `this.`/`Net.`/`Store.`/`Persist.`/`UI.`/`Shape.`/`G.`/`Presentation.`/`self.` は正規メソッド
//   - ドットの直前が `.` なら spread `...name(` — メソッド呼出しではない
// いずれでもなければ誤用として失敗
for(const m of html.matchAll(/\.(_[a-zA-Z]\w{1,4})\(/g)){...}
```

ポイント: レシーバは `_g('x')._trm(` のように `)` 終端もあり得るため
単純な `\w+\.` では拾えない。ドット位置から逆方向に `[A-Za-z_$][\w$]*$`
でレシーバ語を抽出し、空なら (call/括弧終端) 誤用扱いにする。

誤変換で実際に `._trm(` を一時再導入して当該テストが落ちることを確認済み
(mutant 検証)。現在のコードベースでは 397 個の `_` 名に対し誤用 0 件。

併せて read-only のコメント尾を ~350B 刈り込み (byte margin 回復用、
挙動不変 — `_imgChunks`/`_fragIn`/`describeShape`/drop-shadow 等 8 箇所の
説明を ADR 番号併記の短形へ圧縮)。

## 影響

- テスト: +1 件 (2088 全緑)。今後の全 fold が対象。
- index.html: −350B (コメントのみ、挙動不変)。
- 今後の規約: 新しい自由関数 helper を導入する fold は自動的に本ガードの
  監視対象に入る。
