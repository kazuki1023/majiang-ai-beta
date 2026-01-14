# 手牌評価ツールの設計

## 処理の分析

`eval_shoupai.js`の処理を分析すると、以下のような処理フローがあります：

### 1. 初期化フェーズ
- Playerインスタンスの作成
- ルール設定（赤牌有無など）
- 局情報（qipai）の設定
- ドラの設定
- 捨て牌情報の反映（オプション）
- 牌山の残り枚数計算

### 2. 基本評価フェーズ
- 現在のシャンテン数計算
- 現在の期待値計算

### 3. 打牌候補評価フェーズ
- 打牌可能な牌の取得
- 各打牌候補について：
  - 打牌後のシャンテン数
  - 期待値
  - 待ち牌
  - 待ち牌の残り枚数

### 4. 槓候補評価フェーズ
- 槓可能な面子の取得
- 各槓候補の評価

### 5. バックトラック評価フェーズ（シャンテン数2以上）
- シャンテン数が変わらない打牌の評価

### 6. 13枚の場合の処理
- 待ち牌ごとの評価
- 副露候補の評価（チー・ポン）

## ツール分割案

### ディレクトリ構造

```
mastra/src/mastra/tools/
  eval/
    shoupai/
      ├── initialize-player.ts          # Player初期化
      ├── calculate-xiangting.ts        # シャンテン数計算
      ├── calculate-ev.ts               # 期待値計算
      ├── evaluate-dapai-candidates.ts  # 打牌候補の評価
      ├── evaluate-gang-candidates.ts   # 槓候補の評価
      ├── evaluate-tingpai.ts          # 待ち牌の評価
      ├── evaluate-backtrack.ts        # バックトラック評価
      ├── evaluate-fulou.ts             # 副露候補の評価
      ├── calculate-paishu.ts           # 牌山残り枚数計算
      ├── utils.ts                      # 共通ユーティリティ
      └── index.ts                      # メインの統合ツール
```

## 各ツールの詳細設計

### 1. initialize-player.ts
**役割**: Playerインスタンスの初期化と局情報の設定

**入力:**
```typescript
{
  shoupai: string;
  zhuangfeng?: number;
  menfeng?: number;
  baopai?: string[];
  hongpai?: boolean;
  xun?: number;
  heinfo?: string;  // 捨て牌情報（オプション）
}
```

**出力:**
```typescript
{
  player: Player;  // 初期化されたPlayerインスタンス
  gameState: {
    zhuangfeng: number;
    menfeng: number;
    baopai: string[];
    hongpai: boolean;
    xun: number;
  };
}
```

**処理内容:**
- ルール設定
- qipai設定
- ドラ設定
- 捨て牌情報の反映（heinfoがある場合）
- 牌山の残り枚数設定

### 2. calculate-xiangting.ts
**役割**: 手牌のシャンテン数を計算

**入力:**
```typescript
{
  shoupai: Shoupai;  // majiang-coreのShoupaiインスタンス
}
```

**出力:**
```typescript
{
  n_xiangting: number;  // シャンテン数（-1は和了形）
}
```

### 3. calculate-ev.ts
**役割**: 手牌の期待値を計算

**入力:**
```typescript
{
  player: Player;
  shoupai: Shoupai;
  paishu: Paishu;  // 牌山の残り枚数情報
}
```

**出力:**
```typescript
{
  ev: number;  // 期待値
}
```

### 4. calculate-paishu.ts
**役割**: 牌山の残り枚数を計算

**入力:**
```typescript
{
  player: Player;
  xun?: number;
  menfeng?: number;
  heinfo?: string;  // 捨て牌情報
}
```

**出力:**
```typescript
{
  paishu: Paishu;  // 各牌の残り枚数
}
```

### 5. evaluate-tingpai.ts
**役割**: 待ち牌とその残り枚数を計算

**入力:**
```typescript
{
  player: Player;
  shoupai: Shoupai;
  paishu: Paishu;
  n_xiangting: number;  // 現在のシャンテン数
}
```

**出力:**
```typescript
{
  tingpai: string[];      // 待ち牌のリスト
  n_tingpai: number;       // 待ち牌の残り枚数合計
  tingpai_details: Array<{
    pai: string;
    remaining: number;
  }>;
}
```

### 6. evaluate-dapai-candidates.ts
**役割**: 打牌候補を評価

**入力:**
```typescript
{
  player: Player;
  shoupai: Shoupai;
  paishu: Paishu;
  n_xiangting: number;
}
```

**出力:**
```typescript
{
  candidates: Array<{
    tile: string;         // 打牌候補
    n_xiangting: number;  // 打牌後のシャンテン数
    ev: number;           // 期待値
    tingpai: string[];     // 待ち牌
    n_tingpai: number;    // 待ち牌の残り枚数
  }>;
  recommended: string;   // 推奨打牌
}
```

### 7. evaluate-gang-candidates.ts
**役割**: 槓候補を評価

**入力:**
```typescript
{
  player: Player;
  shoupai: Shoupai;
  paishu: Paishu;
  n_xiangting: number;
}
```

**出力:**
```typescript
{
  candidates: Array<{
    mianzi: string;       // 槓の面子
    n_xiangting: number;  // 槓後のシャンテン数
    ev: number;           // 期待値
    tingpai: string[];    // 待ち牌
    n_tingpai: number;    // 待ち牌の残り枚数
  }>;
}
```

### 8. evaluate-backtrack.ts
**役割**: バックトラック評価（シャンテン数が変わらない打牌の評価）

**入力:**
```typescript
{
  player: Player;
  shoupai: Shoupai;
  paishu: Paishu;
  n_xiangting: number;
  max_ev: number;  // 通常評価の最大期待値
}
```

**出力:**
```typescript
{
  candidates: Array<{
    tile: string;
    n_xiangting: number;
    backtrack_ev: number;  // バックトラック評価値
    tingpai: string[];
    n_tingpai: number;
  }>;
}
```

### 9. evaluate-fulou.ts
**役割**: 副露候補（チー・ポン）を評価

**入力:**
```typescript
{
  player: Player;
  shoupai: Shoupai;
  paishu: Paishu;
  pai: string;      // 副露する牌
  type: 'chi' | 'peng';  // チー or ポン
}
```

**出力:**
```typescript
{
  candidates: Array<{
    mianzi: string;       // 副露の面子
    n_xiangting: number;  // 副露後のシャンテン数
    ev: number;           // 期待値
    recommended_dapai: string;  // 副露後の推奨打牌
    tingpai: string[];
    n_tingpai: number;
  }>;
}
```

### 10. utils.ts
**役割**: 共通ユーティリティ関数

**関数:**
- `add_hongpai(tingpai: string[]): string[]` - 赤牌を待ち牌に追加
- `formatTile(tile: string): string` - 牌のフォーマット
- その他のヘルパー関数

### 11. index.ts (メイン統合ツール)
**役割**: 上記のツールを組み合わせて、完全な評価を実行

**入力:**
```typescript
{
  shoupai: string;
  zhuangfeng?: number;
  menfeng?: number;
  baopai?: string[];
  hongpai?: boolean;
  xun?: number;
  heinfo?: string;
  include_gang?: boolean;      // 槓候補も評価するか
  include_backtrack?: boolean; // バックトラック評価も含めるか
}
```

**出力:**
```typescript
{
  current: {
    n_xiangting: number;
    ev: number;
  };
  dapai_candidates: Array<{
    tile: string;
    n_xiangting: number;
    ev: number;
    tingpai: string[];
    n_tingpai: number;
    selected?: boolean;
  }>;
  gang_candidates?: Array<{
    mianzi: string;
    n_xiangting: number;
    ev: number;
    tingpai: string[];
    n_tingpai: number;
  }>;
  recommended: string;  // 推奨打牌
}
```

## 実装の優先順位

### Phase 1: 基本機能
1. `initialize-player.ts` - Player初期化
2. `calculate-xiangting.ts` - シャンテン数計算
3. `calculate-ev.ts` - 期待値計算
4. `evaluate-dapai-candidates.ts` - 打牌候補評価
5. `index.ts` - メイン統合ツール

### Phase 2: 拡張機能
6. `calculate-paishu.ts` - 牌山計算
7. `evaluate-tingpai.ts` - 待ち牌評価
8. `evaluate-gang-candidates.ts` - 槓候補評価

### Phase 3: 高度な機能
9. `evaluate-backtrack.ts` - バックトラック評価
10. `evaluate-fulou.ts` - 副露候補評価
11. `utils.ts` - ユーティリティ

## 設計の利点

1. **モジュール性**: 各機能が独立したツールとして実装可能
2. **再利用性**: 他のツールから個別の機能を呼び出せる
3. **テスト容易性**: 各ツールを個別にテストできる
4. **拡張性**: 新しい評価方法を追加しやすい
5. **Agentでの利用**: Agentが必要な機能だけを選択的に呼び出せる

## Agentでの使用例

```typescript
// シンプルな評価のみ
const result = await evaluateDapaiCandidatesTool.execute({
  context: { player, shoupai, paishu, n_xiangting }
});

// 完全な評価
const fullResult = await evaluateShoupaiTool.execute({
  context: { shoupai, zhuangfeng, menfeng, ... }
});

// 特定の機能だけ
const xiangting = await calculateXiangtingTool.execute({
  context: { shoupai }
});
```
