# ADR-1140 — 文字ハンク衝突時の行粒度 3-way マージ (ADR-1048 P2-a)

Status: Accepted (v1.8.164)

## Context

ADR-1123 は `text`/`label` プロパティに 3-way マージ `_mT3(l,b,r)` を導入した
(`upd`/patch-list 適用の2サイト)。両側の**文字差分ハンク**が非交差なら和集合で
合成し、交差したら remote 時計の勝者をそのまま取る (LWW parity) — つまり
「文字レベルで衝突 → 全文 remote 勝ち」だった。

問題: 共同編集で最も多いパターン — **一方が 2 行目、もう一方が 8 行目を編集** —
でも、中間の `\n` が共通 suffix に吸収されるため両ハンクの文字位置は交差と判定
され、相手側の行編集が全文丸ごと消えていた。

## Audit findings

`_mT3` の文字ハンク判定は「base→local / base→remote の prefix+suffix を除く
中央変化区間」しか見ない。例えば base=`a\nb\nc\nd\ne`、local=`a\nX\nc\nY\ne`、
remote=`a\nb\nZ\nd\ne` では、local ハンク `[2,7)`、remote ハンク `[4,7)` が
交差と判定され remote 一括勝ち — 各行の編集は文字上では近接していても
**行の集合としては完全に disjoint** だった。つまりセマンティクス上の
非衝突を構文上の衝突と誤認して貴重なローカル編集を捨てていた。

## Decision

文字ハンクが交差したとき、`_mT3` は remote 一括勝ちに落ちる前に
**行粒度の 3-way マージ `_mL3`** にリトライする:

- `_lcsA(B,X)` で base→各行側の LCS アライメントを取り、`_hk` で
  「アライメントされていない行の連続区間 (行ハンク)」へ落とす。
- 2 つの行ハンク列を二ポインタで walk し:
  - **一方のみ**のハンク → その置換行列を採用。
  - **両側・同一位置** →
    - 両方 insert のみ (bs===be): 内容が等しければ一方、違えば remote 側先行で
      連結 (決定的)。
    - insert が相手の**内部** (bs<insert<be) に落ちる → null (真の衝突)。
    - 同一範囲・同一内容 → その行列を採用。
    - その他の行範囲交差 → null (真の衝突)。
  - walk 後に残った base 行は共通 prefix/suffix としてそのまま出力。
- `_mL3` が null を返した場合のみ remote 勝ちにフォールバック
  (従来動作と同一の LWW 契約を保持)。
- 各行が 400 行超なら LCS の O(n·m) を打ち切って null — 常に remote 勝ち
  フォールバックへ (DoS/メモリ境界)。

`_mT3(l,b,r)` は `l===r` や `b===l` の速攻分岐を維持し、最後の
`return _m==null?r:_m` で統合。merged≠remote のときは従来どおり
`_txE` に収束 `upd` emit が積まれ、全ピアが同じ和集合に着地する。

## Consequences

- 「A が 2 行目、B が 8 行目を編集」という並行編集の最頻出ケースが
  両方残る和集合に収束 (従来は片側が全文消失)。
- 本当の同一行・同一範囲編集は従来どおり remote 時計勝ち — 決定性と
  LWW parity は不変。
- 400 行境界により巨大テキストの LCS は bounded。
- ADR-1048 の P2-a 完了。残 backlog は P4 のみ。
</content>
