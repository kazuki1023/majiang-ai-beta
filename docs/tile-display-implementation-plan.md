# 麻雀牌の表示方法：実装プラン

## 背景

現在、フロントエンドで麻雀牌が「m123」のような内部表現形式で表示されている箇所があり、ユーザーにとって分かりにくい状態になっています。この文書では、ユーザーフレンドリーな牌表示の選択肢と、それぞれの実装方針を提案します。

## 現状分析

### 既存の実装状況

1. **手牌入力UI**: すでに画像（GIF）で牌を表示
   - ファイル: `frontend/components/shoupai/TileButton/TileButton.tsx`
   - 画像パス: `/pai/{tileId}.gif`（例: `/pai/m1.gif`）
   - 34種類の牌画像 + 赤牌（m0, p0, s0）が存在

2. **分析結果の表示**: Markdownでテキスト表示
   - ファイル: `frontend/components/analysis/AnalysisResult.tsx`
   - 現状: エージェントの出力をそのまま表示（"m123"形式が含まれる可能性）

3. **エージェントの出力形式**:
   - ファイル: `mastra/src/mastra/agents/majiang-analysis-agent.ts`
   - プロンプトで「算用数字でカンマ区切り」を指定
   - 例: 「萬子: 1, 2, 3」

## 提案する表示方法（5つの選択肢）

### 選択肢1: 画像アイコン表示（推奨）

**概要**: 既存の牌画像を使用して、Markdown内に小さな画像アイコンとして表示

**見た目例**:
```
手牌: [🀇][🀈][🀉][🀙][🀚] (実際は画像)
推奨打牌: [🀇]
```

**メリット**:
- 視覚的に最も分かりやすい
- 既存の画像アセットを活用できる
- 電脳麻将など他の麻雀アプリと同様の表現
- 手牌入力UIとの一貫性が高い

**デメリット**:
- Markdown内に画像を埋め込む仕組みが必要
- パフォーマンスへの影響（画像数が多い場合）
- テキストコピー時に画像情報が失われる

**実装方法**:
1. Markdown拡張プラグインまたはカスタムコンポーネント
2. 牌記号（m1, p2など）を検出して画像に置き換え
3. Next.jsのImageコンポーネントで最適化

**実装難易度**: ★★★☆☆（中）

---

### 選択肢2: Unicode麻雀牌絵文字

**概要**: Unicode標準の麻雀牌文字（U+1F000〜U+1F02F）を使用

**見た目例**:
```
手牌: 🀇🀈🀉🀙🀚
推奨打牌: 🀇
```

**メリット**:
- 実装が最もシンプル（単なる文字列置換）
- パフォーマンスへの影響なし
- テキストとしてコピー可能
- 外部アセット不要

**デメリット**:
- フォントによって見た目が異なる（一部の環境で表示されない可能性）
- 赤牌の区別が難しい（Unicode仕様に赤牌がない）
- サイズ調整が難しい
- モノクロ表示になる環境がある

**実装方法**:
1. 牌IDとUnicode文字のマッピングテーブル作成
2. Markdown表示前に文字列置換
3. フォールバック表示の実装

**実装難易度**: ★☆☆☆☆（易）

**Unicode文字マッピング例**:
```typescript
const TILE_UNICODE_MAP = {
  'm1': '🀇', 'm2': '🀈', 'm3': '🀉', 'm4': '🀊', 'm5': '🀋',
  'm6': '🀌', 'm7': '🀍', 'm8': '🀎', 'm9': '🀏',
  'p1': '🀙', 'p2': '🀚', 'p3': '🀛', 'p4': '🀜', 'p5': '🀝',
  'p6': '🀞', 'p7': '🀟', 'p8': '🀠', 'p9': '🀡',
  's1': '🀐', 's2': '🀑', 's3': '🀒', 's4': '🀓', 's5': '🀔',
  's6': '🀕', 's7': '🀖', 's8': '🀗', 's9': '🀘',
  'z1': '🀀', 'z2': '🀁', 'z3': '🀂', 'z4': '🀃',
  'z5': '🀆', 'z6': '🀅', 'z7': '🀄',
  // 赤牌は通常の5で代用または特別な記号
  'm0': '🀋*', 'p0': '🀝*', 's0': '🀔*',
};
```

---

### 選択肢3: スタイル付きテキスト表示

**概要**: 数字と記号を組み合わせ、CSSでスタイリング

**見た目例**:
```
手牌: 1m 2m 3m 1p 2p (または 1萬 2萬 3萬 1筒 2筒)
推奨打牌: 1m
```

**メリット**:
- 実装が比較的簡単
- テキストとして完全にコピー可能
- アクセシビリティに優れている
- 環境依存が少ない

**デメリット**:
- 視覚的インパクトが弱い
- 初心者には分かりにくい可能性
- スペースを取る

**実装方法**:
1. エージェントの出力形式を「1m 2m 3m」に統一
2. CSS Classで色分け（萬子=赤、筒子=青、索子=緑）
3. Markdownのインラインコードまたはカスタムコンポーネント

**実装難易度**: ★★☆☆☆（易〜中）

**スタイル例**:
```css
.tile-manzu { color: #c41e3a; font-weight: 600; }
.tile-pinzu { color: #0047ab; font-weight: 600; }
.tile-sozu { color: #228b22; font-weight: 600; }
.tile-jihai { color: #4a4a4a; font-weight: 700; }
.tile-red { background: #ffe4e1; border: 1px solid #ff0000; }
```

---

### 選択肢4: SVGアイコン表示

**概要**: SVG形式の牌アイコンを作成・使用

**見た目例**:
- 画像表示に近いが、ベクター形式で拡大縮小が滑らか

**メリット**:
- 画像よりファイルサイズが小さい
- 拡大縮小に強い（レスポンシブ対応が容易）
- CSSで色変更可能
- アニメーション追加が容易

**デメリット**:
- SVGアセットの作成が必要（既存GIF画像のベクター化）
- 実装が選択肢1と同程度の複雑さ

**実装方法**:
1. 既存GIF画像をSVG化（手動またはツール使用）
2. SVGスプライトまたは個別コンポーネント化
3. Markdown内で表示（選択肢1と同様の実装）

**実装難易度**: ★★★★☆（中〜高）

---

### 選択肢5: ハイブリッド表示

**概要**: 文脈に応じて表示方法を使い分け

**使い分け例**:
- **表の中**: 簡潔なテキスト表示（「1m」「2p」など）
- **本文説明**: Unicode絵文字または画像
- **手牌一覧**: 画像アイコン

**メリット**:
- 各場面で最適な表示が可能
- 情報密度とUXのバランスが取れる

**デメリット**:
- 実装が複雑
- 一貫性の維持が難しい
- ユーザーが混乱する可能性

**実装難易度**: ★★★★☆（高）

---

## 推奨実装プラン

### フェーズ1: 短期対応（選択肢2: Unicode絵文字）

**理由**: 
- 最速で実装可能
- 既存コードへの影響が最小
- 後から他の方式に移行可能

**実装ステップ**:

1. **牌変換ユーティリティ作成** (30分)
   ```typescript
   // frontend/lib/tile-display-utils.ts
   export function convertTileNotation(text: string): string {
     // m123 -> 🀇🀈🀉
     // p456 -> 🀜🀝🀞
     return text.replace(/([mps])(\d+)/g, (match, suit, nums) => {
       return nums.split('').map(n => TILE_UNICODE_MAP[suit + n]).join('');
     });
   }
   ```

2. **AnalysisResultコンポーネント修正** (15分)
   ```typescript
   // frontend/components/analysis/AnalysisResult.tsx
   import { convertTileNotation } from '@/lib/tile-display-utils';
   
   // Markdown表示前に変換
   const displayContent = convertTileNotation(content);
   ```

3. **エージェントプロンプト調整** (15分)
   - 牌を常に「m123」形式で出力するよう明示

4. **テスト・調整** (30分)
   - 各環境での表示確認
   - フォールバック実装

**合計実装時間**: 約1.5時間

---

### フェーズ2: 中長期対応（選択肢1: 画像アイコン表示）

**理由**:
- 視覚的に最も優れている
- 既存アセットを活用
- 手牌入力UIとの一貫性

**実装ステップ**:

1. **TileIconコンポーネント作成** (1時間)
   ```typescript
   // frontend/components/shoupai/TileIcon/TileIcon.tsx
   export function TileIcon({ tileId, size = 'sm' }: TileIconProps) {
     return (
       <span className={`inline-block ${sizeClasses[size]}`}>
         <Image
           src={`/pai/${tileId}.gif`}
           alt={getTileLabel(tileId)}
           width={size === 'sm' ? 16 : 24}
           height={size === 'sm' ? 22 : 32}
           className="inline-block"
         />
       </span>
     );
   }
   ```

2. **Markdown拡張実装** (2時間)
   - カスタムMarkdownコンポーネント作成
   - 正規表現で牌記号を検出
   - TileIconコンポーネントに置換

   ```typescript
   // frontend/lib/markdown-tile-plugin.ts
   export function processTileNotation(content: string): ReactNode {
     const parts = content.split(/(\[m[0-9]\]|\[p[0-9]\]|\[s[0-9]\]|\[z[1-7]\])/g);
     return parts.map((part, i) => {
       const match = part.match(/\[([mpsz])([0-9])\]/);
       if (match) {
         return <TileIcon key={i} tileId={match[1] + match[2]} />;
       }
       return part;
     });
   }
   ```

3. **エージェントプロンプト調整** (30分)
   - 牌を `[m1]` 形式で出力するよう指示

4. **パフォーマンス最適化** (1時間)
   - 画像の遅延読み込み
   - 画像サイズ最適化

5. **テスト・調整** (1.5時間)
   - モバイル/デスクトップ表示確認
   - アクセシビリティチェック

**合計実装時間**: 約6時間

---

## 実装の詳細設計

### 1. ファイル構成

```
frontend/
├── components/
│   └── shoupai/
│       ├── TileIcon/
│       │   ├── TileIcon.tsx      (新規: 牌アイコンコンポーネント)
│       │   └── index.ts
│       └── TileButton/
│           └── TileButton.tsx    (既存: 手牌入力用)
├── lib/
│   ├── tile-display-utils.ts     (新規: 変換ユーティリティ)
│   └── markdown-tile-plugin.ts   (新規: Markdown拡張)
└── types/
    └── tile-display.ts           (新規: 型定義)

mastra/
└── src/mastra/agents/
    └── majiang-analysis-agent.ts (修正: プロンプト調整)
```

### 2. 型定義

```typescript
// frontend/types/tile-display.ts

export type TileDisplayMode = 'unicode' | 'image' | 'text' | 'svg';

export interface TileDisplayConfig {
  mode: TileDisplayMode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  colorize?: boolean;
}

export interface TileNotationPattern {
  pattern: RegExp;
  converter: (match: RegExpMatchArray) => string | ReactNode;
}
```

### 3. エージェントプロンプト修正案

```typescript
// mastra/src/mastra/agents/majiang-analysis-agent.ts

// フェーズ1用（Unicode）
instructions: `
  ...
  牌の表記:
  - 手牌文字列は必ず m123p456s789 のような形式で記述してください
  - 例: m123 は萬子の1, 2, 3を表します
  ...
`

// フェーズ2用（画像）
instructions: `
  ...
  牌の表記:
  - 個別の牌は [m1] [m2] のような形式で記述してください
  - 例: [m1] [m2] [m3] は萬子の1, 2, 3を表します
  - 手牌一覧: [m1][m2][m3][p4][p5][p6]
  ...
`
```

### 4. 変換ロジック実装例

```typescript
// frontend/lib/tile-display-utils.ts

const TILE_UNICODE_MAP: Record<string, string> = {
  'm1': '🀇', 'm2': '🀈', 'm3': '🀉', 'm4': '🀊', 'm5': '🀋',
  'm6': '🀌', 'm7': '🀍', 'm8': '🀎', 'm9': '🀏', 'm0': '🀋',
  'p1': '🀙', 'p2': '🀚', 'p3': '🀛', 'p4': '🀜', 'p5': '🀝',
  'p6': '🀞', 'p7': '🀟', 'p8': '🀠', 'p9': '🀡', 'p0': '🀝',
  's1': '🀐', 's2': '🀑', 's3': '🀒', 's4': '🀓', 's5': '🀔',
  's6': '🀕', 's7': '🀖', 's8': '🀗', 's9': '🀘', 's0': '🀔',
  'z1': '🀀', 'z2': '🀁', 'z3': '🀂', 'z4': '🀃',
  'z5': '🀆', 'z6': '🀅', 'z7': '🀄',
};

/**
 * 牌記号をUnicode絵文字に変換
 * m123 -> 🀇🀈🀉
 */
export function convertToUnicode(text: string): string {
  return text.replace(/([mpsz])([0-9]+)/g, (match, suit, nums) => {
    return nums
      .split('')
      .map(n => TILE_UNICODE_MAP[suit + n] || match)
      .join('');
  });
}

/**
 * 牌記号を画像表示用の形式に変換
 * m123 -> [m1][m2][m3]
 */
export function convertToImageFormat(text: string): string {
  return text.replace(/([mpsz])([0-9]+)/g, (match, suit, nums) => {
    return nums
      .split('')
      .map(n => `[${suit}${n}]`)
      .join('');
  });
}

/**
 * 手牌文字列をユーザーフレンドリーな形式に変換
 */
export function formatHandForDisplay(
  shoupai: string,
  mode: TileDisplayMode = 'unicode'
): string | ReactNode {
  switch (mode) {
    case 'unicode':
      return convertToUnicode(shoupai);
    case 'image':
      return convertToImageFormat(shoupai);
    case 'text':
      return convertToTextFormat(shoupai);
    default:
      return shoupai;
  }
}
```

### 5. Reactコンポーネント実装例

```typescript
// frontend/components/shoupai/TileIcon/TileIcon.tsx

import Image from 'next/image';
import { getTileLabel } from '@/lib/shoupai-utils';
import type { TileId } from '@/types';

export interface TileIconProps {
  tileId: TileId;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const SIZE_CLASSES = {
  xs: 'w-3 h-4',
  sm: 'w-4 h-5',
  md: 'w-6 h-8',
  lg: 'w-8 h-11',
};

const SIZE_DIMENSIONS = {
  xs: { width: 12, height: 16 },
  sm: { width: 16, height: 22 },
  md: { width: 24, height: 32 },
  lg: { width: 32, height: 44 },
};

export function TileIcon({ 
  tileId, 
  size = 'sm',
  showTooltip = false 
}: TileIconProps) {
  const label = getTileLabel(tileId);
  const dimensions = SIZE_DIMENSIONS[size];
  
  return (
    <span 
      className={`inline-block ${SIZE_CLASSES[size]} relative mx-0.5 align-middle`}
      title={showTooltip ? label : undefined}
    >
      <Image
        src={`/pai/${tileId}.gif`}
        alt={label}
        width={dimensions.width}
        height={dimensions.height}
        className="object-contain"
        unoptimized // GIFアニメーション保持
      />
    </span>
  );
}
```

---

## テスト計画

### 1. ユニットテスト

```typescript
// frontend/lib/__tests__/tile-display-utils.test.ts

describe('convertToUnicode', () => {
  test('萬子の変換', () => {
    expect(convertToUnicode('m123')).toBe('🀇🀈🀉');
  });
  
  test('複数スートの変換', () => {
    expect(convertToUnicode('m123p456s789')).toBe('🀇🀈🀉🀜🀝🀞🀖🀗🀘');
  });
  
  test('赤牌の変換', () => {
    expect(convertToUnicode('m0p0s0')).toBe('🀋🀝🀔');
  });
});
```

### 2. ビジュアルテスト

- Storybookでコンポーネント表示確認
- 各ブラウザ・デバイスでの表示確認
- ダークモード対応確認

### 3. パフォーマンステスト

- 大量の牌表示時のレンダリング速度
- 画像読み込み時間の測定
- メモリ使用量の確認

---

## 段階的ロールアウト

### ステップ1: 実験的実装（1週間）
- フェーズ1（Unicode）を実装
- 開発環境で動作確認
- フィードバック収集

### ステップ2: 本実装（2週間）
- フェーズ2（画像）を実装
- ユーザーテスト実施
- パフォーマンス最適化

### ステップ3: リリース（1週間）
- 本番環境デプロイ
- モニタリング
- 必要に応じて調整

---

## 考慮事項

### アクセシビリティ
- スクリーンリーダー対応（alt属性、aria-label）
- キーボードナビゲーション
- 高コントラストモード対応

### 国際化
- 日本語以外の言語対応（英語で "1 man", "East wind" など）
- ロケール設定による表示切り替え

### パフォーマンス
- 画像の遅延読み込み
- 画像のプリロード・キャッシング
- 仮想スクロール（大量表示時）

### モバイル対応
- タッチ操作の最適化
- 画面サイズに応じたレイアウト調整
- タッチターゲットサイズの確保（最小44x44px）

---

## 結論

**推奨アプローチ**: 
1. **短期**: Unicode絵文字（選択肢2）を実装 - 1.5時間で完了
2. **中長期**: 画像アイコン（選択肢1）に移行 - 6時間で完了

この2段階アプローチにより、素早くUXを改善しつつ、最終的には最高品質の表示を実現できます。
