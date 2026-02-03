# 牌表示の設計理由（PaiProvider / loaddata / majiang-ui）

## なぜこういう形にしたか

牌ボタンで majiang-ui を参照するために、**PaiProvider ＋ loaddata（35個の .pai 要素）＋ Context** という構成にしている理由をまとめる。

---

## 1. なぜ loaddata（35個の .pai 要素）が必要か

**majiang-ui の API がそうなっているから。**

majiang-ui の `pai` は次のような仕様になっている（`lib/pai.js` のイメージ）:

```js
// majiang-ui の pai
module.exports = function(loaddata) {
    const pai = {};
    $('.pai', loaddata).each(function(){
        let p = $(this).data('pai');  // 各要素の data-pai（m1, p2, ... "_"）
        pai[p] = $(this);
    });
    return function(p){
        return pai[p.slice(0,2)].clone();  // 牌コードで clone を返す
    }
}
```

- **入力**: 「`.pai` が並んだコンテナ」を 1 つ渡す（loaddata）
- **出力**: 「牌コード（m1, p2, "_" など）を受け取ると、対応する要素の **clone** を返す関数」

つまり「**あらかじめ 34 種＋裏の 35 個の“ひな形”を用意し、表示するときはその clone を使う**」という API なので、  
**ひな形（loaddata）を 1 箇所で用意しないと使えない**。  
「1 枚だけ描画する」ような API は majiang-ui にはない。

だから「画面上に 35 個の .pai 要素を持つ loaddata を 1 つ用意する」設計にしている。

---

## 2. なぜ PaiProvider と Context で「pai 関数」を渡しているか

- **pai 関数は「loaddata を 1 回読んで作る」もの**なので、**1 回だけ生成して使い回したい**。
- その関数を **多くの TileButton から参照**する必要がある。
- 親から子へ props でずっと渡す（prop drilling）は冗長なので、**Context で 1 回セットして、TileButton は usePai() で取る**形にしている。

つまり「**pai を 1 回だけ作り、どこからでも同じものを使う**」ために PaiProvider ＋ Context にしている。

---

## 3. なぜ動的 import（useEffect 内で import）にしているか

- majiang-ui は **jQuery と DOM** に依存している。
- Next ではサーバでもコンポーネントが動くため、**最初からトップレベルで import すると**、サーバ側で `window` や `document` がない・jQuery が想定どおり動かない、といった問題が出やすい。
- **「クライアントでマウントされたあと」だけ** majiang-ui と jQuery を読むようにするために、**useEffect の中で動的 import** している。

「サーバでは読まない・ブラウザでだけ読む」をはっきりさせるための設計。

---

## 4. もっとシンプルにできないか

**majiang-ui を使う限り**は、上記の「loaddata を 1 つ用意 → pai(loaddata) で clone 用関数を得る」流れは変えられない（ライブラリの仕様）。

シンプルにしたい場合は、**majiang-ui を使わない**選択肢がある:

- **案 A**: 今まで通り「牌は文字（一萬、②筒など）だけ」で表示する。loaddata も PaiProvider も不要。
- **案 B**: 牌画像（SVG/PNG）を 34 種用意し、`paiId` に対応する画像を 1 枚ずつ `<img>` で表示する。majiang-ui の clone は使わない。
- **案 C**: 今の設計のまま、majiang-ui の「clone 表示」を使う。電脳麻将などと同じ牌見た目に寄せたいときに選ぶ。

「なぜこういう設計にしなくちゃいけないか」は、**majiang-ui の API（loaddata ＋ clone）に合わせているから**で、  
**majiang-ui を使わない**なら、もっとシンプルな構成（A や B）にできる。
