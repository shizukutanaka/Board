# ADR-0414: describeShape に flip/shadow/route を announce

## 状態
実装済 (v1.7.449)

## 背景
`describeShape` は選択 announce + DOM mirror の両経路で SR ユーザーへ
図形を説明するが、視覚的に判別できる属性の一部 (flip・drop shadow・
コネクタの elbow/curve ルート) が音声化されていなかった —
canvas/SVG には出るが SR チャンネルに無い「視覚のみの情報」。

## 決定
- `s.flip` → `ctxFlipH`/`ctxFlipV` (ビット両立時は `H+V` join)
- `s.shadow` → `ctxShadow`
- `_conn(s.type)` の `s.elbow`/`s.curve` → `ctxElbow`/`ctxCurve`
  (排他ルートなので `elbow?…:…` の単項)
- 既存 i18n キーをそのまま再利用 (ja/en 両方在籍、追加キーなし)

`fstyle`(hatch/cross)・`hop` も対象にしたが、512KB 上限内に収めるため
今回は見送り (再収録候補)。

## 影響
- 選択巡回・DOM mirror で反転/影/ルート形状が読み上げられる (WCAG の
  情報パリティ方向へ整合)。
- 視覚ユーザーには変更なし。

## 断念した代替案
- 全スタイル prop (fill/stroke/dash/size/opacity/align…) の announce:
  読み上げが CSS リスティング化して認知負荷が増す — 識別に直結する
  属性に限定した。
