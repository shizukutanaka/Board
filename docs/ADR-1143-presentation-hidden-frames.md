# ADR-1143 — プレゼンのフレーム列挙から hidden を除外

## Context

hidden parity は確立済み契約: ミニマップ (`_shV`)、エクスポート全型、
hop マーク、マーキー選択、ピア選択輪郭、スナップ、等間隔/等サイズsnap、
Tab チェーンは全て `visible===0` の図形を除外する (ADR-0566,0592-0595,0665-0669 等)。

## Audit finding

`Presentation._getFrames()` は `_frm(s)&&_pgOk(s)` のみでフィルタし、
`_hd(s)` (`visible===0`) を見ていなかった — 全表示面の中で
唯一の non-hidden-aware 列挙。

影響:

1. ユーザーがフレームを hide しても (ローカル ctx メニューか remote `hide` op で)、
   プレゼンはそのフレームをスライドとして巡る → 真っ暗な空スライドが表示され、
   カウンタと SR announce がそのラベルを読む。
2. プレゼン中に remote `hide` が着地しても、`_goto` の `byId` 再解決フィルタが
   `visible` を見ないため隠れたフレームがリストに残る。
3. 全フレーム hidden でも「noFrames」ではなく enter が成功してしまう。

注: `visible===0` は図形を消さない — `byId` 再解決は通常通り返すので
`_goto` は削除と同じ枠で扱えない (削除は `f` 落ちで弾かれるが hide は通過した)。

## Rejected option

re-enter ガード (`if(_active)return`): ⇧P/⌘Enter/ボタン全てが `_pA()` キー
抑止または UI 非表示でプレゼン中は物理的に非到達 (ADR-0640)。
未到達の防衛コードは載せない (YAGNI)。

## Change

- `_getFrames()` — フィルタに `!_hd(s)` 追加。
- `_goto()` の re-resolve フィルタに `!_hd(f)` 追加 — mid-pres hide が
  次の nav/refit で確実に脱落し、全フレーム hidden 化なら `leave()` へ。

## Contract

- hidden フレームはスライドに数えない (enter 時、nav 時とも)。
- 全可視フレームが消えた/隠れた → `leave()` で終了 (del と同じシーム)。
- 他の hidden parity 面と同じく、`visible===0` へ戻せば再度列挙される
  (`_getFrames` は enter 毎に再評価)。

## Verification

test.mjs に8ピン (ソース2 + 振る舞い6):

- hidden+visible 2枚で enter → viewport は可視フレームへ着地 (hidden は計上されない)
- 全 hidden → `isActive()` false (`noFrames` 経路)
- 2枚 enter → 1枚を mid-pres hide → `next()` で `_goto` が hidden を脱落させ
  `_idx` クランプで可視フレームへ戻る

`node test.mjs` — 4349 pass / 0 fail。
