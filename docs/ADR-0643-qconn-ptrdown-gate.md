# ADR-0643 — quick-connect の PD 時掴み判定を ptr.down ガードから解放

## 状態
**採用** (v1.7.669)

## 文脈
ADR-0070 の quick-connect は、ホバー中図形の4辺中点にドットを描き、掴むと結合矢印ドラッグを開始する — とされていた。しかし spec §14.3.1 P3 の実イベント経路検証で、**ドット掴みが一度も発火していない**ことが判明した。

原因: `_qconnShape()` は `!ptr.down` を要求する — これは overlay 描画 (ドット表示) がドラッグ中にドットを隠すためのガード。一方 `_qdotAt(wp)` は pointerdown の tool dispatch 内で呼ばれるが、PD ハンドラでは `ptr.down=true` が tool dispatch より**先**に立つため、`_qconnShape` は常に null を返し、結果 `qd` も常に null → `pickOrMarquee` にフォールしていた。導入コミット時点から dead code だった。

## 決定
`_qconnShape(g)` を引数化 — `g=1` で `ptr.down` ゲートを免除する。`_qdotAt` は `_qconnShape(1)` を呼ぶ。overlay (ドット描画) は従来通り無引数で `ptr.down` ゲートを効かせ、ドラッグ中のドット非表示を維持する。

## 影響
- quick-connect が実動作するようになる (エッジ中点ドラッグ → `dragKind='qline'` → `endLineLike` で双端束縛)。
- シグネチャ変更は +~15B。
- test.mjs のソースピン (`function _qconnShape()` 文字列) を `_qconnShape(1)` 呼出へ追従。

## 検証
- 実経路ピン: hover → エッジ中点 PD → 対象図形上 PU → `conn.a`/`conn.b` 双端束縛を assert。
- 回帰検出の教訓: この種の「表示されるが掴めない」バグはソースピンでは検出不能 — 実リスナ dispatch の系列検証 (ADR-0641) でのみ観測できた。
