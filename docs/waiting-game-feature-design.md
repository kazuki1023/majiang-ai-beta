# 待ち時間ゲーム機能 — 設計メモ

手牌写真アップロード後の認識待ち時間（約 30 秒）を「ゲームをプレイする時間」に転換する機能の設計・課題・選択肢をまとめる。

---

## 1. 背景・現状の課題

### 1.1 待ち時間の UX 問題

- 手牌写真をアップロードしてから、認識結果が手牌入力コンポーネントに返るまで **平均 30 秒弱(体感)** かかっている。
- 現状の UI は「スピナー + 「手牌を読み取っています...」」のみで、ユーザーは何もできない。
- この時間は **最悪な UX** として認識されている。

### 1.2 速度と精度のトレードオフ

- 精度の悪いモデルで早く返すと、**正答率が低い手牌情報**が渡り、結果として UX も悪い。
- したがって「待ち時間を短くする」よりも、**待ち時間そのものを価値ある時間に変える**方向を検討している。

### 1.3 現状の技術的な流れ

- `useImageRecognition` が `phase: "uploading" | "recognizing"` の間 `isBusy` / `statusPhase` を返す。
- `ImageUpload` が `statusPhase` があるときにスピナーと `StatusMessage` を表示。
- 認識完了後に `ShoupaiInput` に `recognizedShoupaiString` を渡して表示。

→ **「uploading」の段階からゲームを表示し、recognizing 中も継続する** のが狙い（表示タイミングは方針決定済み）。

---

## 2. やりたいこと

### 2.1 短期（まずやりたいこと）

- 待ち時間中に **ユーザーができるゲーム** を 1 つ表示する。
- 第一候補: **清一色何待ち** を当てるゲーム（問題手牌を見て待ちを答える）。
- その時間中にしかできない体験にすることで、待ち時間を「無駄」ではなく「遊び」に変える。

### 2.2 中期（ゲームの種類・アンケート）

- **ここから何切る** のようなアンケート形式のコンテンツを追加する案。
- ユーザーの選択を集計し、**結果を見せる** ことで「みんなは何切ってる？」という興味を満たす。

### 2.3 長期（収益・エンゲージメント）

- **課金要素**（例: ゲームの追加、ヒント、広告非表示など）。
- **ユーザー間ランキング**（スコア・正答率・連続正解など）。
- **アンケート結果の可視化**（全体傾向・自分の回答との比較など）。

---

## 3. 設計の核心的な問い: feature の切り方

> 「ゲーム毎に features を切る形がいいのか、features ではそのゲームを表示させる枠だけを持たせて、そこにコンポーネントを入れる感じが良いのか」

### 3.1 将来像を踏まえた要件

- ゲームごとに **ユーザー設定** での切り替え・変更（どのゲームを表示するか、難易度など）があり得る。
- **課金の有無** による切り替え（ゲームの解禁、問題作成権限、ヒントなど）があり得る。
- 課金・ランキングは **「待ち時間ゲーム全体」** にも **「ゲーム種類ごと」** にもあり得る（課金設計に依存）。どちらの場合でも対応できる設計にしたい。

→ これらを満たすには、**ゲーム単位で「設定・課金情報を取得して渡す」責務** を持たせた方がきれい。その情報は **server action で取得し、feature がゲームに渡す** 形にすると、client / server の境界も明確になる。

### 3.2 採用方針: 枠もゲームも features に。waiting-game 配下にゲームごとのフォルダ

- **枠** … 「いつゲームを表示するか」「どのゲームを表示するか（ユーザー設定・課金に応じた選択）」を担当する feature。**これも features で作る**。
- **各ゲーム** … 1 ゲーム = 1 feature として **同じく features に置く**。ただし **waiting-game の「中」に**、ゲームごとのフォルダを切る。
- ゲーム feature は、**server action で「そのゲームの設定・課金状態」を取得し、ゲーム用のコンポーネント（またはページ）に渡す**。枠は「今表示するゲーム」を 1 つ選び、そのゲームの entry をレンダする。

この形にすると:

- ゲームごとの設定・課金・ランキングは **そのゲームの feature に閉じる**（または game id 単位で API と組み合わせる）。
- 枠は **waiting-game のルート** に 1 つだけあり、「待ち時間中に何を表示するか」の共通ロジックが一箇所にまとまる。
- 将来「このゲームを単体ルートで遊べるようにする」場合は、同じゲーム feature を別ルートから呼べばよい。

### 3.3 フォルダ構成（実装用に詰めた形）

§8 の次のステップ（枠のインターフェース・清一色何待ちの最小仕様・「どのゲームを表示するか」のインターフェース）を踏まえた、実装にそのまま使える構成。

```
features/
  analysis/
    analysis-page.tsx          # waiting-game の export を呼び出し、AnalysisPageContent に waitingContent として渡す
    index.ts
  waiting-game/
    index.tsx                  # 枠＋ゲームを組み立てて export（例: getWaitingGameContent() または <WaitingGameContent />）
    WaitingGameSlot.tsx        # 枠 UI。children + onDismiss。レイアウト・辞めるボタン
    types.ts                   # （将来）GameId、利用可能ゲーム一覧の型。「どのゲームを表示するか」の契約
    get-game-content.ts        # 「どのゲームを表示するか」を決める。現状は固定で chinitsu-machi の entry を返す。将来はユーザー設定・課金に応じて game id を決め、対応するゲームの ReactNode を返すインターフェース
    chinitsu-machi/
      index.ts                 # ゲーム entry を export（<ChinitsuMachiGame />）
      ChinitsuMachiGame.tsx    # ゲーム UI: 問題（手牌）、数字選択欄（電卓風）、回答ボタン、正誤＆答え表示、次ボタン
      data/
        questions.json         # 静的データ。問題＋正解の一覧。正誤は回答と正解の完全一致で判定
    nanikiru-survey/           # (将来) ここから何切るアンケート
      ...

components/
  ImageUpload/
    ...                        # waitingContent?: ReactNode の差し込み口を追加
  analysis/
    AnalysisPageContent.tsx    # 待ち時間ゲームの表示条件（下記「表示の終了」参照）。ImageUpload に waitingContent を渡す
```

**役割の整理**

| 対象 | 役割 |
|------|------|
| **waiting-game/index.tsx** | `get-game-content.ts` で「今表示するゲーム」の ReactNode を取得し、`WaitingGameSlot` の children として組み立てて export。analysis はこの export を呼ぶだけ。 |
| **get-game-content.ts** | 「どのゲームを表示するか」のインターフェース。現状は chinitsu-machi 固定。将来は利用可能ゲーム一覧・ユーザー設定・課金に応じて game id を決め、該当ゲームの entry を返す。 |
| **chinitsu-machi/** | 問題・正解は `data/questions.json` を import。正誤は完全一致。UI は ChinitsuMachiGame.tsx に問題表示・数字選択欄・回答ボタン・正誤＆答え表示・次ボタン。 |
| **analysis/analysis-page.tsx** | waiting-game の export を呼び出し、得た ReactNode を `AnalysisPageContent` に `waitingContent` で渡す。 |
| **components** | feature を import しない。`waitingContent` を表示するだけ。ImageUpload は optional な差し込み口を持つ。 |

### 3.4 かつての選択肢（参考）

- **A: ゲームごとに feature を切る（トップレベル）** … ゲームが `features/chinitsu-machi-game/` のように並ぶ。共通の「待ち時間枠」が別 feature になるか、各ゲームが枠の責務も持つか、いずれにしても「枠」の重複か分散が起きやすい。
- **B: 枠だけ feature、ゲームは components** … ゲームごとの設定・課金を components の外に書く必要があり、拡張時に「ゲーム＝feature」でまとめた方が扱いやすいという判断で、今回は **枠もゲームも features、かつ waiting-game 配下にゲームをまとめる** 形を採用。

---

## 4. 方針決定済みの項目

- **表示タイミング**  
  **upload 直後**（`uploading` の段階）からゲームを表示する。微差だが、アップロードした直後から遊べた方がよい、という判断。

- **ゲームのデータ源**  
  **静的データ**（JSON/import 等）。問題は **自分（運営）で作る**。将来的に **課金ユーザーが問題を作れる** ようにするのもあり、と想定しておく。

- **認識完了・キャンセル時の挙動（望ましい UX）**  
  **ゲームの状態による**。導線は「問題を解く → 回答 → 正誤を見る → 次の問題」。
  - 認識が終了しても、**ユーザーが正誤を見て「次の問題」を押すまでゲームは続ける**（即閉じない）。**写真の upload が終わった瞬間にゲームを消さない**。
  - あるいは **「辞める」ボタン** を押したらゲームを終了し、手牌入力に遷移する。
  - 写真差し替え（キャンセル）でゲームを閉じるときの状態リセット・スコア送信は別途仕様化。

- **表示の開始・終了条件（設計上の要請）**  
  - **表示を開始する条件**: 写真アップロード開始後（`isBusy` が true になったとき）からゲームを表示する。  
  - **表示を終了する条件**: **ユーザーの明示的な操作**（「辞める」を押す、または「結果を見る」などで手牌入力に移る）までゲームを表示し続ける。**認識完了（isBusy が false）になっただけでは非表示にしない**。  
  - そうでないと「認識が終わった瞬間にゲームが消える」という**突然終了する体験**になり、当初の「待ち時間中に遊んでもらう」意図とズレる。

- **課金・ランキングのスコープ**  
  課金設計に応じて **「ゲーム種類ごと」** にも **「待ち時間ゲーム全体」** にもあり得る想定。**どちらの場合でも対応できる設計** にする（枠が「利用可能なゲーム」を server action で取得し、ゲームごとの課金状態も渡す形で対応可能にする）。

- **feature → components に ReactNode を props で渡す形**
  - **採用イメージ**: **枠＋ゲームの組み立ては `features/waiting-game/index.tsx` 等で行い**、組み立てた結果を export する。**`features/analysis/analysis-page.tsx` はその export を呼び出し**、得られたものを `AnalysisPageContent` に props（例: `waitingContent?: ReactNode`）で渡す。client components は feature を import せず、受け取った ReactNode を表示するだけにする。

---

## 5. feature → components に ReactNode を渡すことの問題点・発生しうること

- **表示のオンオフは「受け取った client 側」で行う**
  - feature が渡すのは **「枠＋ゲーム」の ReactNode だけ**でよい。**表示するか・非表示にするかは、それを受け取った client（components 側）で条件分岐する**。
  - **注意（現状実装とのズレ）**: 単純に `{isBusy && waitingContent}` とすると、**認識が終わって isBusy が false になった瞬間にゲームが消える**。設計上は「表示を終了するのはユーザー操作（辞める／結果を見て次へ）まで」としたいため、**表示開始条件（isBusy が true になった）と表示終了条件（ユーザーが辞める等）を分けて持つ**必要がある。例: 「一度表示したら、onDismiss が呼ばれるまで表示し続ける」など、client 側で「表示し続けるか」の状態を管理する。
  - `useImageRecognition` は components 側のままでよく、表示開始のトリガーは isBusy でよい。表示終了は「辞める」押下などを親が知る必要があるため、枠から onDismiss を親に渡すか、親が gameId と表示状態を持って枠を組み立てるか、いずれかの形で対応する。

- **型で契約を表現できない**
  - ReactNode は「何でもよい」ので、枠が「`onDismiss` を呼ぶ」などの契約を型で強制できない。スロット側の仕様（必要なコールバックや表示条件）はドキュメントやインターフェース定義で明文化しておく必要がある。

- **テスト時に「差し込む中身」を用意する必要**
  - components の単体テストでは、`waitingContent` に null やダミーの ReactNode を渡して「スロットがある場合／ない場合」の表示やレイアウトを検証することになる。feature に依存しない分、テスト用のモックは渡しやすい。

- **レンダリングの責任範囲**
  - 表示しないときは client が条件に応じて**描画しない**ので、その間は枠のツリーはレンダされない。枠に `visible` を渡して枠側で出し分ける必要はない。表示条件は「表示開始＝isBusy で開始」「表示終了＝ユーザー操作で終了」を満たすように client 側で状態を持つ。

---

## 6. 枠（WaitingGameSlot）のインターフェース（方針）

- **枠は features 配下のゲームを ReactNode で受け取る**
  - 枠コンポーネントの props に **`children` または `gameContent`** のような **ReactNode** を設け、その中に「今表示するゲーム」（例: 清一色何待ちの entry）を渡す。枠は見た目・レイアウト・「辞める」ボタンなどの共通 UI だけを担当し、中身はゲーム側に任せる。

- **枠は表示非表示を司らない**
  - **表示するかどうかは、受け取った client 側で制御する**。client が「表示開始＝isBusy」「表示終了＝ユーザーが辞める等」を満たすように状態を持ち、その条件で waitingContent を出し分ける。枠に `visible` のような props は不要。※単純に isBusy だけで出し分けると認識完了と同時にゲームが消えるため、表示終了はユーザー操作に紐づける必要がある（上記「表示の開始・終了条件」参照）。

- **まとめ（枠の props 案）**
  - `children` または `gameContent: ReactNode` … 枠の中に表示するゲーム（features 配下のゲームを渡す）。
  - （必要に応じて）`onDismiss?: () => void` … ユーザーが「辞める」を押したときに親に通知する。親（client 側）が枠を閉じる・手牌入力に遷移するなどの処理を行う。

- **呼び出しの流れ（イメージ）**
  - **`features/waiting-game/index.tsx`（など）** で枠とゲームを組み立て、その結果（ReactNode またはコンポーネント）を export する。
  - **`features/analysis/analysis-page.tsx`** は waiting-game の export を **呼び出し**、得られたものを `<AnalysisPageContent waitingContent={…} />` のように **props で渡す**。
  - AnalysisPageContent（client）は `useImageRecognition` で `isBusy` を持ち、**表示開始は isBusy で、表示終了はユーザー操作（例: 枠の onDismiss）で行う**形で `waitingContent` を描画する。ImageUpload には「差し込み口」として `waitingContent` を渡す。※isBusy のみで表示を切ると認識完了と同時にゲームが消えるため、設計どおりにするには「一度表示したら onDismiss まで表示し続ける」などの状態が必要。

---

## 7. オープンな疑問・検討事項

- **現状実装と設計のズレ（表示終了条件）**
  - 設計では「認識が終わってもゲームは即閉じず、ユーザーが辞める／次の問題で閉じるまで表示し続ける」としている。
  - 現状は **`isBusy && waitingContent`** で表示を切り替えているため、**写真の upload（認識）が終わった瞬間にゲームが非表示**になり、ユーザーには「突然ゲームが終わった」体験になっている。
  - 設計に合わせるには、**表示開始＝isBusy が true になったとき**、**表示終了＝ユーザーが「辞める」等を押したとき**と分け、client 側で「表示し続けるか」の状態（例: 一度表示したら onDismiss が呼ばれるまで表示）を持つ必要がある。そのためには枠の「辞める」から親へ onDismiss を渡すか、親が gameId と表示状態を持って枠を組み立てるか、いずれかの形で対応する。

- **features と components の依存方向**
  - **components が feature に依存するのは避ける**。`app` → `features` → `components` の一方向を維持する。
  - **枠＋ゲームの組み立ては waiting-game で行い**、analysis は **waiting-game が export したものを呼び出して**、AnalysisPageContent に props（ReactNode）で渡す。ImageUpload には、AnalysisPageContent が受け取った `waitingContent` をそのまま渡す。ImageUpload は feature を import しない。
  - **client / server の境界**: 組み立て（server action でデータ取得など）は waiting-game 内で完結させ、client には組み立て済みの ReactNode を渡す形にする。枠・ゲームの entry を server / client のどちらに置くかは、実装時にあらためて決める。

- **アクセシビリティ**
  - ゲームに集中している間に認識が完了した場合、**スクリーンリーダーやフォーカス**をどう移すか（「結果を見る」や「辞める」を押したときの focus trap など）。

---

## 8. 次のステップ（案）

1. **枠のインターフェース** … §6 のとおり。枠は `children`（ゲーム ReactNode）を受け取り、必要なら `onDismiss` を追加する。表示非表示は枠ではなく受け取った client 側の条件分岐で行う。
2. **呼び出し側と ImageUpload の責務**
   - **ImageUpload は feature に依存しない**。**waiting-game** が枠＋ゲームを組み立てて export し、**analysis** がそれを呼び出して `AnalysisPageContent` に `waitingContent` として渡す。`AnalysisPageContent` がそれを ImageUpload に渡す。ImageUpload の API を「`waitingContent?: ReactNode` のような optional な差し込み口」に拡張する。
3. **清一色何待ちゲームの最小仕様**
   - **データ**: 問題も回答（正解）も **静的** で用意（JSON/import 等）。**正誤判定はユーザーの回答と正解の完全一致**で行う（majiang-core は使わない）。
   - **1 問の流れ**: 問題表示 → 回答入力 → 回答ボタン → 正誤＆答え表示 → 次の問題 / 辞める。
   - **表示要素**: 問題（手牌表示）、**数字選択欄**（電卓のような入力 UI）、回答ボタン、**正誤＆答え表示箇所**、次ボタン（および辞めるボタンは枠側で想定）。
4. **waiting-game 配下のゲーム entry**
   - `features/waiting-game/chinitsu-machi` が問題・設定を取得しゲーム UI に渡す形の具体化。現状は 1 種類でも、**将来ユーザー設定でゲームを切り替えられる**ことを想定し、**「どのゲームを表示するか」を決めるインターフェース**（例: 利用可能ゲーム一覧を返す / 選ばれた game id に応じて entry を返す）を先に決めておく。そうしておけば、後から設定・課金を足しても枠の呼び出し方が変わらない。
5. **ドキュメントの更新**
   - 本設計で決まった「枠もゲームも features / waiting-game 配下にゲームフォルダ」「components は feature に依存しない」「表示は upload 直後から」「認識完了後はユーザー操作で閉じる」を、`docs/frontend-code-review.md` や README に追記し、今後の追加ルールにする。

---

### 8.1 実装の進め方（案）

フォルダ構成 §3.3 に沿って、次の順で実装に移る。

1. **枠と「どのゲームを表示するか」の土台**
   - `features/waiting-game/types.ts`（必要なら GameId 等）
   - `features/waiting-game/get-game-content.ts`（現状は chinitsu-machi の entry を返すだけ）
   - `features/waiting-game/WaitingGameSlot.tsx`（children + onDismiss）
   - `features/waiting-game/index.tsx`（枠＋get-game-content で取得したゲームを組み立てて export）

2. **清一色何待ちゲーム**
   - `features/waiting-game/chinitsu-machi/data/questions.json`（静的データの型と中身）
   - `features/waiting-game/chinitsu-machi/ChinitsuMachiGame.tsx`（問題表示・数字選択欄・回答ボタン・正誤＆答え表示・次ボタン）
   - `features/waiting-game/chinitsu-machi/index.ts`（ChinitsuMachiGame を export）

3. **analysis と components の接続**
   - `AnalysisPageContent` で `useImageRecognition` の `isBusy` を使い、`isBusy` のときだけ `waitingContent` を描画
   - `ImageUpload` に `waitingContent?: ReactNode` を追加し、表示する箇所で条件分岐
   - `features/analysis/analysis-page.tsx` で waiting-game の export を呼び出し、`waitingContent` として渡す

4. **動作確認**
   - 写真アップロード直後から枠＋清一色何待ちが表示され、認識完了後も「次」「辞める」までゲームが続くことを確認

---

## 9. 設計レビュー（凝縮度・変更容易性・結合度）

凝縮度・変更容易性・結合度の観点から、本設計を評価する。

---

### 9.1 凝縮度（Cohesion）

**良い点**

- **「待ち時間ゲーム」という関心の集約**: 枠（表示タイミング・ゲーム選択）と各ゲーム（chinitsu-machi, nanikiru-survey）が `features/waiting-game/` 配下にまとまっている。待ち時間中に何を表示するか・どのゲームの設定・課金を扱うかが一つの feature に閉じている。
- **ゲーム単位の責務**: 各ゲームが独自フォルダを持ち、そのゲームの「データ取得（server action）・設定・課金」をその feature に閉じ込めている。清一色何待ちを変えたいときは `chinitsu-machi/` だけ触ればよい。
- **枠と中身の役割分離**: 枠は「共通 UI・レイアウト・辞めるボタン」、中身は「ゲームの ReactNode」と分かれており、枠の見た目を変えてもゲームロジックに手を入れないで済む。
- **表示制御の一貫した持ち主**: 表示するかどうかは「受け取った client（components）の条件分岐」に一本化されており、枠が visible を持たないことで責務が分散していない。

**注意・改善の余地**

- **組み立ては waiting-game に閉じている**: 枠＋ゲームの組み立ては `features/waiting-game/index.tsx` 等で行い、analysis は「export されたものを呼び出して渡す」だけなので、analysis の責務は「分析ページとして waiting-game の結果を差し込む」一点に抑えられている。
- **枠の「どのゲームを表示するか」のロジック**: そのロジックが waiting-game 内に集中しすぎると index が肥大化する。ゲーム一覧・選択ルールを別モジュール（例: `waiting-game/available-games.ts`）に切り出し、index は「選ばれたゲームを枠に渡してレンダする」だけにすると凝縮度が上がる。

---

### 9.2 変更容易性（Modifiability）

**良い点**

- **依存の向きが一方向**: `app` → `features/analysis` → `components`。components は feature を import せず、`waitingContent` を props で受け取るだけなので、「待ち時間ゲームの仕様を変える」ときは features 側の変更で済み、ImageUpload 等の変更を最小にできる。
- **ゲームの追加が局所**: 新ゲームを足すときは `features/waiting-game/新ゲーム/` を追加し、枠の「どのゲームを表示するか」の選択に 1 つ追加するだけ。既存ゲームや components への変更が少ない。
- **表示条件の変更が client 側に局所**: 「いつゲームを表示するか」を変えたいとき（例: recognizing だけにする）は、`isBusy` の解釈や条件分岐をしている AnalysisPageContent / ImageUpload の 1 箇所を変えればよい。枠や feature のインターフェースはそのままでよい。
- **契約の明文化**: ReactNode では型で縛れないため「スロットの仕様はドキュメントで明文化する」と §5 で書かれており、変更時の参照先がはっきりしている。

**注意・改善の余地**

- **AnalysisPageContent の責務**: 既存のタブ・チャット・エラー・結果表示に加え、「`isBusy` のとき `waitingContent` を表示する」が乗る。変更が一箇所に集中しやすい。`WaitingContentSlot` のような薄いラッパーに「isBusy なら children を表示」を閉じ込め、AnalysisPageContent はそれを配置するだけにすると、「表示条件の仕様変更」がさらに局所化できる。
- **枠のインターフェース変更**: 枠に `onDismiss` などを追加するときは、枠を組み立てている waiting-game 側だけを触ればよい。analysis は「呼び出した結果」を渡すだけなので、枠の props が変わっても analysis の変更は最小で済む。枠の props は少なめに保ち、必要最小限にしておくと変更コストが抑えられる。

---

### 9.3 結合度（Coupling）

**なぜ「結合度が低い」と言えるか**

- **feature → components**: components は feature を import しない。受け取るのは **ReactNode だけ**なので、「何が渡るか」の型やゲームの内部に依存していない。つまり **「表示用の差し込み口」という 1 種類の契約**だけでつながっており、データ構造や API でがっちり結びつく「高い結合」になっていない。
- **analysis → waiting-game**: analysis が知るのは **waiting-game の export 1 つ**（「呼ぶと ReactNode が得られる」というインターフェース）だけ。組み立ての中身（どのゲームを選ぶか、server action、ゲーム一覧）は waiting-game に閉じているので、**結合の接触点が「呼び出し口」の 1 点**に限られている。
- **optional にできる**: `waitingContent` を optional にしておけば、待ち時間ゲームを使わない構成では analysis が waiting-game に依存しなくてもよく、**結合そのものを外せる**。

**良い点**

- **features → components の結合が「ReactNode 1 本」**: feature が components に渡すのは「表示すべき ReactNode」だけ。components は waiting-game の内部（どのゲームがあるか、どうデータを取るか）に依存しておらず、**データの結合**ではなく**表示の差し込み**だけなので結合度は低い。
- **状態の持ち主が components 側のまま**: `useImageRecognition` を feature に移さず、`isBusy` を components が持つことで、analysis feature は「画像認識の状態」に結合していない。analysis は「waiting-game が組み立てたものを呼び出して渡す」だけに専念できる。
- **ゲーム間の結合が薄い**: 各ゲームは自分のフォルダに閉じ、枠が「今表示するゲーム」を選んでレンダするだけ。ゲーム A の変更がゲーム B に波及しにくい。
- **共通契約が緩い**: 枠は「children（ReactNode）と onDismiss（任意）」だけを前提にすればよく、ゲームが何を返すか・内部で何をしているかには依存しない。新ゲームを追加しても既存ゲームとの結合は増えない。

**注意・改善の余地**

- **analysis と waiting-game の結合**: **組み立ては waiting-game で行い、analysis は「waiting-game が export したものを呼び出す」だけ**なので、analysis が知るのは「呼び出し口（export）の 1 つ」だけ。組み立ての詳細（どのゲームを選ぶか、server action の使い方など）は waiting-game に閉じており、analysis は「得られた ReactNode を渡す」だけに結合する。別ページ（例: 単体ゲームページ）で同じ枠・ゲームを使う場合も、そのページが waiting-game を import する形で、結合の向きは「利用する feature → waiting-game」に統一される。analysis を「待ち時間ゲームなしでも動く」ようにする場合は、`waitingContent` を optional のままにし、渡されなければ何も表示しない形にしておけばよい。
- **client / server の境界**: 組み立て（server action でデータ取得など）は waiting-game 内で完結する。analysis-page が client か server かで、呼び出し方（組み立て済み ReactNode をそのまま渡すか、client 用ラッパーを経由するか）が変わる。実装時に境界をはっきり決めておくと、境界をまたぐ結合が増えすぎるのを防げる。

---

### 9.4 まとめ

| 観点       | 評価 | 補足 |
|------------|------|------|
| 凝縮度     | 良い | 待ち時間ゲームが一 feature にまとまり、ゲーム単位の責務も分かれている。枠の「ゲーム選択」ロジックの置き場所だけ注意するとよい。 |
| 変更容易性 | 良い | 依存一方向・ゲーム追加の局所化・表示条件の変更が client に局所。AnalysisPageContent の責務集中は薄いラッパーで緩和可能。 |
| 結合度     | 低い | 理由は §9.3 冒頭「なぜ結合度が低いと言えるか」参照。要するに接触点が「ReactNode 1 本」と「export 1 つ」に限られ、optional で結合を外せる。 |

---

以上、現状の課題・やりたいこと・設計の選択肢・方針決定・オープンな疑問をまとめた。疑問が決まり次第、本ドキュメントを更新していく想定。
