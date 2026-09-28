# ADR-0544: 未テスト export のカバレッジ第二弾 (import/paste/conn/fit)

- 状態: 実装済み (v1.7.572)
- 系: test

## 背景

ADR-0543 で12関数をカバーした後も、`importBoardText`/`doPasteAt`/
`_connPathPts`/`_grpRotHandle`/`_fitIfEmptyView` が未実行のままだった。
import 経路は外部データの入口なので reject/配置の契約を pin したい。

## 決定

- test.mjs behavioural 末尾に第二ブロックを追加:
  - `importBoardText`: 非 JSON / 空 shapes の reject、wp への中央配置
  - `doPasteAt`: 指定ワールド座標へのセンタリング
  - `_connPathPts`: straight ≥2 / elbow ≥3 / curve =17 点 + chord からの湾曲
  - `_grpRotHandle`: bbox 上辺中央の上方配置
  - `_fitIfEmptyView`: 空盤面では no-op、画面外コンテンツは回収

## 影響

- 実行のみの変更。index.html はバージョン番号のみ (+0B 実質)。
- ADR-0543 と合わせて、export 済み主要ヘルパの未テスト残件を解消。
