# ADR-0311: drawio 複数ページを横並びで取り込む

## 状態
承認 — round50

## 背景
`querySelectorAll('mxCell')` は全 `<diagram>` のセルを走査する
ため複数ページの drawio を取り込むとページ 2 以降の図形がページ 1
の座標に重畳していた (実質ページ 1 しか見えない)。

## 決定
各 `<diagram>` の `pageWidth` (既定 850) で累積 x オフセット
(+200 gap) を `_doff` に保持し、vertex の x・edge 自由端点・
waypoints に加算。bound 端点は vertex bbox から解決されるため
自動的に追従。

## 断念した代替案
- ページ毎に別ボード — Board は scratchpad 単一ボードなので不可。
- 最初のページのみ取込 (警告付) — 全内容が失われるより横並びの
  方が常に有用。

## 影響
複数ページ .drawio が欠落なく取り込まれる。2018 全緑。
