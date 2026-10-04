# ADR-0995 — 全置換スワップ後の stale editor クロージャを live へ再束縛

## 対象

テキスト編集 (`openTextEditor` の blur commit)、ラベル編集 (`openLabelEditor` の commit)、付箋連鎖 (`_stickyChain`) の3つのクロージャが、open 時に捕獲した shape 参照 `s`/`hit` に直接書き込む。wholesale swap (remote `'replace'`/`'clear'`、snapshot adopt、import `_rs`) は盤面オブジェクトを**新しい配列要素へ差し替える** — `byId(s.id)` は置換後オブジェクトを解決するが、クロージャは死んだ旧オブジェクトを掴み続ける。

## 実害

修正前のゲートは `!byId(s.id)||_lk(s)` — 存在判定は live 解決するのに書込は stale 参照へ:

1. テキスト編集中に remote `'replace'` が着地 → blur commit が `resizeAfterTextEdit(s,...)` + `upd` op の `after` を **死んだオブジェクト** に書き込む。
2. wire `upd` op は正しく peers へ届く (after 値は正しい) が、ローカル live 図形は remote 側が送った `text:''` のまま — **一方向発散** (ピアは 'hello'、ローカルは空白)。しかも後続の `_apply` upd は live 時計で仲裁されるため、dead オブジェクトへの書込は永遠に表れない。
3. ラベル編集は同型 (`hit`)。`_stickyChain` は `s.x+s.w+16` を stale 座標から計算 — 連鎖先の付箋が誤位置に出る + `add` op は正しく peers へ届くため、こちらも一方向発散 (ローカルのみ誤座標)。

## 修正

3サイト全てを「存在判定と同一の再束縛代入」に変更 — `!(s=byId(s.id))` (label は `!(hit=byId(hit.id))`)。existence 判定と参照の両方を一回の `byId` で解決し、以後の読み書きは置換後の live オブジェクトへ向かう。locked 判定はそのまま `_lk` (置換後オブジェクトの `locked` で判定するのが正しい — 0992 監査で「全ての stale 参照は id で live 再解決するか除去サイトでパージされる」が規則として確立済みで、本修正はその未適用残穴)。

```js
// openTextEditor blur:
if(!(s=byId(s.id))||_lk(s)){state.editing=null;_teTa=null;_rm(ta);_iv();return}
// openLabelEditor commit:
if(!(hit=byId(hit.id))||_lk(hit)){_lblTa=null;_rm(inp);_iv();return}
// _stickyChain:
if(!(s=byId(s.id))||s.type!=='sticky'||_lk(s))return;
```

`_stickyChain` は guard の順序も変わる (`type` チェックが `byId` 再解決の**後**) — swap 後に同 id が別型 (例: text) へ再誕生したケースでも `s.type!=='sticky'` が live オブジェクトで判定されるためむしろ正確。

## 波及・非波及

- **波及なし (正しい向き)**: swap で対象図形が除去された場合 `byId` は falsy → fold 経路 (0556/0967) は不変。locked への変更も `_lk` が live 値を読む。
- **フォロー関数**: `positionTextEditor`/`_teFollow` は呼出毎に `byId` を通る経路のみ (0992 clean) — 本3サイトのみが捕獲参照を保持していた。
- スライダー系は 0962 の `_sfbBlur` で live 再解決済み。

## 検証

`test.mjs` ADR-0995 ブロック (7 assert): fakeDoc の listener キャプチャで実 `ta.blur()`/`inp.blur()` を発火 —
1. text editor を `'e1'` で開き `remote 'replace'` でオブジェクト差替 → `byId('e1')!==preObj` + live `text===''` 前提 → blur 後 live `text==='hello'` (dead 書込ではない) + wire `upd` op が peers へ届く。
2. label editor 同型 — swap 後 blur commit で live `label==='l1'`。
3. `_stickyChain({...byId('e3'),x:0})` — live `x:500` に対し stale `x:0` を渡しても連鎖先付箋が `500+160+16=676` へ (live 基準)。
