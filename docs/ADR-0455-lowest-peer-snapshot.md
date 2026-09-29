# ADR-0455: snapshot 応答を最小 id ピアのみへ + prop shorthand 畳み込み

- 状態: 実装済
- 日付: 2026-09-23

## 背景

1. `hello`/`sync-req` への snapshot 応答条件は `if(_pi()<msg.peer)` で、コメントは
   「only one peer should — pick by id ordering」と言いながら、実際は
   joiner より小さい id のピアが**全員**応答していた。3+ ピア部屋では
   N-1 個の重複 snapshot (全体クローン+slim+チャンク化) が飛び、joiner は
   全部を受けて捨てる無駄だった。
2. `_selAny(s=>A&&!_lk(s)&&B)` (mid-predicate の `_lk` ゲート) が `_selUnl` の
   対象から漏れていた。`&&` は純粋読み述語で結合順序不変のため畳み込み可。
3. `s.size`/`s.text`/`s.font`/`s.color` の prop 読みがそれぞれ 42/26/12/9 箇所に
   散在していた (従来の `_sk`/`_fi`/`_lb` 等と同じ畳み込み対象)。

## 決定

1. 応答条件を `_pi()<msg.peer && ![..._pr().keys()].some(k=>k!==this._rtcPeerId&&k<_pi())`
   に変更 — 自分が**既知ピア中最小**かつ joiner より小さいときのみ応答。
   `_rtcPeerId` は合成 id (`rtc:`+uid) で BC 経路のピアではないため min 計算から除外
   (含めると低い合成 id が正当な BC 応答を抑制し得た)。ピア情報が不完全な
   初期状態では複数応答になるが、既存動作と同等で悪化はしない。
2. `_selAny(s=>(_conn(s.type))&&!_lk(s)&&EXPR)` 4 箇所を `_selUnl` へ。
3. prop shorthand `_szz`/`_txx`/`_ftt`/`_coo` を追加し ~230B 回収
   (`(?![\w$])` 境界ガードで `s.fontSize` 等の prefix 誤爆と write サイトを除外)。

## 影響

- マルチピア部屋での重複 snapshot 送信が消えた (ピア相互が互いを既知なら確実に1人)。
- index.html 524,107B (上限 524,288)。
- test.mjs: n-mismatch 後続リテラルの `s.*` prop を折り畳み形に同期 (17 箇所)。
