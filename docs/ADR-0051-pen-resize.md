# ADR-0051: ペンストロークの真のリサイズ (pts スケール)

- 日付: 2026-09-23
- 状態: 承認
- 関連: audit-2026-06 §残課題 (pen の真のリサイズ保留 → 本 ADR で解消),
  ADR-0019 (pen bbox メモ化 — スケール後の bbox は署名変化で自動再計算),
  ADR-0046 (アウトライン塗り — pts 変更は幅配列にも流れる)

## 背景

`getHandles` は `s.type==='pen'` でハンドルゼロを返していた (pts しか持たず
x/y/w/h を直接書くと NaN 化するための防衛)。結果としてペンは移動のみ可能で、
選択 → 角ドラッグでの拡縮が存在しない — audit-2026-06 の残課題「pen の真の
リサイズ (pts スケール)」が該当する。

## 決定

- **`getHandles`**: pen は `G.bbox(s)` から 8 ハンドルを生成 (box 系と同一の
  ハンドル集合 → `hitHandle`/`handleCursor` はそのまま動く)。
- **`applyResize`** の pen 早期分岐: orig の bbox `ob` を仮想 box に写し、
  同じハンドル数式を `applyResize(box,...)` 再帰で走らせる — Shift 比率ロック、
  Alt 中心対称、obj/grid スナップ、ガイド全てが自動的に効く。結果の
  `sx=vbox.w/ob.w, sy=vbox.h/ob.h` で
  `sh.pts = orig.pts.map(p => [vbox.x+(p[0]-ob.x)*sx, vbox.y+(p[1]-ob.y)*sy, p[2]])`
  — orig.pts からの写像なのでドラッグ中の浮動誤差が累積しない。
- 圧力値 `p[2]` は幾何と無関係に保持。
- rotate: `shapeRot(pen)` は w 不在で常に 0 → 回転パスは関係しない。
- undo: リサイズのコミットは `upd` スナップショット op (before/after に pts 全体)
  → 既存経路で完全に可逆・LWW 済み。

## 断念した代替案

- **bbox だけの変形 + drawPen で scale transform**: draw/export/hit の3経路全てに
  transform を通す必要があり、pts 実写の方が整合的 (display=output parity 維持)。
- **幅配列 w のスケール**: 選択の見た目サイズが拡縮に比例して変わるのは意図的
  (太さはストロークの素性) — shift 無しで片面だけ潰す等の歪みが自然に効く。

## 影響

- ペンを選択→8ハンドルで拡縮。縮退 (1点/ゼロ面積) はガードで no-op。
- test.mjs: presence + applyResize/pts 写像の挙動テスト (se 角の sx/sy 写像)。
