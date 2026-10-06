# ADR-1058: ペン描画のスケルトン平滑化 (`_penSm`)

Date: 2026-10-06. Round807 (ADR-1048 改善候補 — 短所 W37)。

## 問題 (W37)

ペンストロークはポインタがサンプリングした点列 `s.pts` をそのまま直線結合して描画
していた (ADR-0046 の台形+円板 union は点列の骨格に沿って primitive を並べる)。
マウス・タッチ・低サンプルレートのデジタイザでは、1サンプル単位のジッターが
角ばった線として視認できる。既存の対策は RDP による間引き (ADR-0034) と
getPredictedEvents による末尾の先行インク (ADR-0023) のみで、描画画質自体への
フェアリング (平滑化) パスは存在しなかった。

## 決定

データを変えずに**描画面で**スケルトンを平滑化する。

```
_penSm(p):  n<3 → p をそのまま返す (alloc なし)
            端点 p[0]/p[n-1] は不変 (アンカー)
            内部点 i: ((p[i-1]+2·p[i]+p[i+1])/4) 加重ブレンド
            圧力 p[i][2] は index 維持で素通し
```

- **(1,2,1)/4 加重の理由**: 最小限のフェアリング。1サンプルの外れ値を
  近傍の重心へ1/4寄せるだけで、角ばりを目立たなくする。真のスプライン通過
  (midpoint 二次ベジエ等) は曲率を変えすぎて意図的な角も丸める — KISS/YAGNI
  の範囲で効果が最大の式。
- **データ不変**: `s.pts` は書き換えない。hit-test・bbox・undo・wire op・
  persist は全て生サンプルのまま。平滑化は純粋な描画関数 — オフライン/復元/
  RTC で一切の収束影響なし。
- **同長配列の理由**: `penWidths`/`_penTaper*`/`_penFillRange`/`_inkSegDraw`
  は全て点 index で整合する設計 — 同じ n を維持すれば圧力と幅テーパーの
  対応が崩れない。
- **端点不変の理由**: ストロークの両端はテーパーのアンカーであり、
  接続やループの開始点。端点が移るとコネクタに沿った線がずれて見える。

## 適用面 (単一 helper で3面を統一)

| 面 | サイト | 方式 |
|---|---|---|
| canvas 描画 (確定 stroke・bitmap cache・minimap・PNG) | `drawPen` | `const p=_penSm(s.pts)` — 以後 `penWidths`/`_penFillRange` が sp を使う |
| ドラフト (描画中の live ink) | `drawPenDraft` | `const sp=_penSm(p)` — コミット `_inkSegDraw`・live tail `_penFillRange`・速度モード raw 幅計算は sp の近傍を使う |
| スタンプ再構築 | `_inkRebuild` | `d.w=penWidths(sp)` + `_inkSegDraw(sp)` — ベイクされた bitmap が平滑化済み |
| SVG エクスポート | exportSVG pen 分岐 | `const P=_penSm(s.pts.map(...))` — display=output parity |

3面が同一 helper を共有しないと「描画中と確定後で形が違う」「SVG が canvas と
違う」という二重の見た目不整合になる — 面ごとの別実装は禁止。

## 境界・非目標

- **bbox**: 平滑化点は近傍三角形の内部に留まる → 生 pts の bbox に必ず内包。
  キャッシュ bitmap の割当 (`_inkRebuild` の `pad`) は生 bbox から計るため
  平滑化で bitmap はみ出しは起きない。
- **n<3 は素通し**: 2点以下は既に直線 — 配列を返さず alloc もしない。
- **角度のある意図的線**: 折れ線 (例: Shift 軸拘束の1点) は少数点なので
  実質影響なし。Beautify 後の図形は pen でなくなるため無関係。
- **非目標**: 曲率連続なスプライン、データ永続化、点列の再サンプリング
  (間引きは ADR-0034 が担当)。

## テスト

Behavioural: `_penSm` を api 経由で直接検証 —
端点同一性・(1,2,1)/4 ブレンド・圧力 index 維持・n<3 素通し・戻り値の同長性。
Source pins: `function _penSm`・`drawPen`/`drawPenDraft`/`_inkRebuild`/SVG が
`sp` を使う・`penWidths(sp` 整合。
