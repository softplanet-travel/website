# SoftPlanet V1 Design System & Mobile UI Specification

版本：V1.0  
產品範圍：SoftPlanet MVP 與後續 V1 頁面  
適用來源：靜態 HTML、JSON、資料庫與任何未來內容來源

## 1. 設計原則

1. 保持 MUMU、奶茶色與溫暖陪伴感。
2. SoftPlanet 是內容型旅行產品，不做成管理工具或資料後台。
3. 所有元件先以 320px 完成，再依序驗證 375、390、430px；平板與桌面只做漸進放大。
4. 文字必須符合本文件的 Typography System，不依文字來自哪一種技術或服務而改變規則。
5. 元件優先使用共用 token 與既有 component，不使用零散的任意尺寸。

## 2. Typography Scale

| Token | Mobile | 430px+ | Weight | Line-height | Letter-spacing | 用途 |
|---|---:|---:|---:|---:|---:|---|
| Display | 32px | 36px | 800 | 1.15 | -0.03em | 品牌主視覺 |
| H1 | 28px | 32px | 800 | 1.22 | -0.025em | 頁面主標題 |
| H2 | 24px | 28px | 800 | 1.28 | -0.02em | 主要區塊標題 |
| H3 | 20px | 24px | 800 | 1.35 | -0.015em | 卡片群組標題 |
| Title | 18px | 20px | 800 | 1.4 | -0.01em | 卡片標題 |
| Subtitle | 16px | 18px | 700 | 1.5 | 0 | 次標題 |
| Body L | 17px | 18px | 500 | 1.7 | 0 | 品牌說明、重要內容 |
| Body | 16px | 16px | 400 | 1.7 | 0 | 一般內容 |
| Body S | 14px | 14px | 400 | 1.6 | 0 | 卡片說明、輔助內容 |
| Caption | 12px | 12px | 500 | 1.5 | 0.01em | 時間、來源、狀態 |
| Button | 14px | 14px | 800 | 1.4 | 0.01em | CTA 與控制項 |
| Badge | 12px | 12px | 800 | 1.3 | 0.02em | 標籤 |

## 3. Component Text Budget

Text Budget 是語意、行數及版面共同限制，不只是字數限制。超出時先改寫文案，其次才調整版面或字級。

| 角色 | Font token | 最大行數 | Overflow Rule | 建議 Text Budget |
|---|---|---:|---|---|
| Title | Title | 2 | 不截斷完整詞語；超出須改寫 | 中文 18 字內 |
| Subtitle | Subtitle | 2 | 語意斷句；不留下單一中文字 | 中文 28 字內 |
| Description | Body S／Body | 2–3 | 卡片 2 行、內容頁最多 3 行 | 中文 48 字內 |
| Caption | Caption | 2 | 可換行，不拆固定詞組 | 中文 24 字內 |
| Button | Button | 1 | 不換行；改寫 CTA | 中文 8 字內 |
| Empty State | H3 + Body S | 標題 2、描述 3 | 超出須改寫 | 標題 18、描述 54 字內 |
| Helper Text | Caption | 2 | 保留完整動作或限制說明 | 中文 36 字內 |

## 4. Chinese Typography Rules（中文排版規範）

1. 不得出現單一中文字落在第二行。
2. 不得拆開完整詞語或固定詞組，例如「與住宿」、「我的旅行」、「開始探索」。
3. 標題、副標題及說明文字優先採語意斷句，不依容器寬度任意切割。
4. 文案超出範圍時，優先改寫文案，其次調整版面與字級；不得依賴 CSS 強制斷行解決內容問題。
5. 元件必須有合理最大行數。若第三行只剩少量文字，必須重新撰寫。
6. 同組卡片的標題、內文與 CTA 位置必須一致，不因文字長短錯位。
7. 標題與按鈕採 `word-break: keep-all`；敘述採 `text-wrap: pretty`，並由內容驗收確認語意斷句。

## 5. Spacing System

唯一正式 spacing scale：`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48px`。

- 4、8：文字與圖示、Badge 內距
- 12、16：表單、卡片內部元件
- 20、24：卡片 padding、區塊間距
- 32、40、48：Hero、主要 section 與頁面層級留白
- 禁止新增 13、15、17、18 等任意間距；舊元件在修改時逐步回收至 scale

## 6. Card System

| 項目 | 規則 |
|---|---|
| Radius | 小卡 16px、標準卡 20px、Hero／大型卡 24px |
| Shadow | `0 8px 24px rgba(61,52,44,.08)` |
| Padding | 標準 20px；緊湊型 16px |
| Title | Title token，最多 2 行 |
| Description | Body S，最多 2 行 |
| CTA | Button token，固定在卡片內容底部 |
| Internal spacing | 8、12、16px |

景點、住宿、美食、旅行、提醒與入口卡共用相同 surface、radius、shadow、padding 與文字角色。內容類型可以改變圖片比例及色彩，但不能自行發明另一套卡片骨架。

## 7. Empty State System

統一結構：MUMU／Icon → Title → Description → Primary Button → Secondary Link。

- 使用同一個 surface、20px radius、24px padding 與 card shadow。
- Title 最多 2 行，Description 最多 3 行。
- Primary Button 必須清楚說明下一步；Secondary Link 只提供返回或替代路徑。
- Loading、Empty、Error 與 Coming Soon 共用結構，只調整內容，不建立不同外觀。

## 8. Home Hero

1. 圖片必須占滿 Hero。
2. Greeting 必須整合於 Hero，不再獨立成 Greeting Card。
3. Hero 包含品牌形象、一句品牌文案與個人 Greeting；只有存在明確主要任務時才加入 CTA。
4. Hero 是首頁視覺核心，但不得遮蔽底部導覽或強迫使用者操作。

## 9. Home Entry Cards

「旅行靈感」與「我的旅行」必須同高。Icon、Title、Subtitle 及 CTA 使用相同 grid row 對齊；不得因文字長短改變 CTA 位置。

## 10. Custom Card Reference Links

專屬小卡不限制平台，不建立 Google／Naver／Apple 專用欄位。最多三組：

- 名稱：例如官方、Google Maps、KKday、Blog、YouTube
- URL：僅接受安全的 HTTPS 網址

每一組必須同時有名稱與 URL。地圖服務只是普通參考連結；若連結可辨識為地圖，既有「查看地圖」仍可使用該連結。舊資料的 Google／Naver 欄位讀取時轉為相容參考連結。

## 11. Mobile First Acceptance

每一個新元件必須依序驗證：320 → 375 → 390 → 430 → 768 → 1024 → Desktop。

- 不得先做 Desktop 再縮小。
- 320px 不得水平捲動、裁切控制項或遮蔽 CTA。
- Bottom Navigation 不得蓋住表單與最後一個操作。
- 表單在手機鍵盤開啟時仍應能捲動至送出按鈕。
- 同組卡片必須維持對齊，中文不得出現不自然孤字。

## 12. Engineering Contract

- CSS token 定義於 `css/style.css` 的 `:root`。
- 元件使用共用 `.sp-card`、`.soft-empty`、Typography 與 spacing token。
- 新文案進入 UI 前，由元件的語意角色與 Text Budget 驗收；規則不綁定 JSON、資料庫或任何內容產生方式。
- 若內容無法在 budget 內清楚表達，應回到產品文案調整，不以縮到難閱讀或硬截斷處理。
