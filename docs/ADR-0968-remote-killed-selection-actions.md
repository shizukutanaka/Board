# ADR-0968: ctx/key action family on a remote-killed selection — audit complete

**Status:** Accepted (audit, no code change) — v1.7.994

## 背景

ADR-0956 系 (edit overlay fold, 0964–0967) と同族の残軸: **ctx メニューやキー
アクションが対象とする図形が、メニューを開いた後〜クリックするまでの間に
remote del/lock で消滅・ロック**された場合の安全性。

`UI.openCtxMenu` は開いた瞬間に項目と述語 (`has=_selN()>0`、`_selAny` /
`_selUnl` / `_selConnL` / `_selTxtL` / `_selArrowL` フィルタ、
`ctxLock`/`ctxUnlock` ラベル) をスナップショットする。表示は古いまま残り得る
(許容するコスメティック差) が、各ハンドラが **act 時に live 再解決** するかを
監査対象とした。

## 監査結果 — clean 完走

- **remote del** は `_apply`/`applyRemote` の `_sdl(id)` で選択 id を除去
  (ADR-0568/0954)。選択が空になれば `_selN()===0` で全ハンドラ早期 return。
- **remote lock** は `_selUL`/`_selUnl`/`_usI`/`_forSel`/`_forConn` の
  `_lk`/`_ul`/`_ulv` ゲートで act 時に除外 (0623 dead-id + 0964–0967 系と同型)。
- **全 ctx ハンドラ live 再解決を確認**: `doDelete` (`_selUL`→lockedNoop)、
  `doLock` (`_selL(Boolean)`→空 return)、`doDuplicate` (`byId`+`!_lk` フィルタ)、
  `doGroup`/`doUngroup` (`_usI`/`gids` live)、`hideSelection` (`_cxO`+`_lk`/`_hd`)、
  `selectSamePaint` (`_selL!==1`)、`doAlign`/`doMatchSize` (`_selUL<2`)、
  `connectSelection` (`_sb().filter(_ulv)!==2` toast)、`doClearAll` (`_nS()+` ページ
  スコープ)、`toggleHop`/`fitFrames`/`resetRoute`/`reverseConn`/`fitSticky`/
  `pinAnchor`/`unbindSelection`/`cycleVAlign`/`toggleWrap`/`cycleTextAlign`/
  `cycleFont`/`cycleOpacity`/`cycleStickyColor`/`cycleFillStyle`/`cycleSpacing`/
  `cycleLineH`/`toggleBothEnds`/`toggleLineArrow`/`cycleArrowHead`/`cycleStartHead`/
  `toggleRound`/`toggleElbow`/`toggleCurve`/`toggleStickyText`/`toggleShadow`/
  `cycleCorner`/`doMatchSize`/`doFlip`/`doRotate`/`doBring*`/`doSend*`/`showAllShapes`/
  `unlockAll`/`exportSelection`/`replaceImage`/`setSelLink`/`openSelLink`/
  `selectSameType`/`selectInverse`/`snapSelToGrid` — 全て `_forSel`/`_forConn`/
  `_sb().filter`/`_selL`/`_selUL`/`byId`+`_lk`/`_hd`/`_sv`/`_pgOk` で live 解決し、
  空集合・dead 集合は return/toast で収束。
- **stale メニュー表示は cosmetic**: `ctxLock`/`ctxUnlock` ラベルが開時の
  `_sel0()?.locked` に固定されるが、`doLock` は act 時に `!sel[0].locked` で
  toggle を再導出するため実効正しい。Figma 等のネイティブ慣例でも外部変更で
  メニューを閉じないため、`_gridVer` 連動の fold は設計しない。
- **overlay 群は既網羅**: editor fold (0556–0559/0967)、hide/lock/page-switch
  fold (0569/0572/0709/0684)、presentation (0582/0634)、overlay-open gesture
  cancel (0945) は同族で済み。

## 契約

「選択由来の全アクションは act 時に live 選択集合へ再解決し、dead/空集合では
 op を産まない」を behavioural ピンで固定:

- `Net._onRecv` 実経路で remote del → `state.selection` が空になることを確認
- その状態で ctx/key 系14関数 (`doDelete`/`doDuplicate`/`doGroup`/`doUngroup`/
  `doLock`/`doBeautify`/`doFlip`/`doRotate`/`doAlign`/`doMatchSize`/`doBring*`/
  `doSend*`/`doClearAll`/`exportSelection`) を呼んでも `state.history` 不変
- ハーネス教訓: remote clock ts は `nowTs()` (HLC) で刻印 — `nowTs()+N` の未来
  ts は shared `_lastTs` を持ち上げ後続テストの `Date.now()` 時計を born 負けさせる

実害なし。発散経路ゼロ。
