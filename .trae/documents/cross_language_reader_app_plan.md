# 跨语言阅读辅助 App — 当前实施计划

## Summary

本计划基于当前代码库继续构建 Android/iOS 跨语言阅读辅助 App。项目已经完成 React Native (Expo) + TypeScript 基础架构、WatermelonDB 本地数据库、AI Provider 抽象层、OCR 编排、学习指导、学习本与设置页雏形。

后续目标是把已经存在的页面与服务串成可运行 MVP，并按用户确认的方向，将阅读器选词能力升级为底层原生富文本选区方案，而不是用输入框、剪贴板或纯 JS Markdown 规则绕开核心体验。

核心用户流程保持为：拍照或选图 -> 火山方舟视觉模型 OCR 生成 Markdown -> AI 生成阅读前学习指导 -> 用户阅读富文本原文 -> 在原文中长按/拖动选择词、短语或句子 -> 翻译或加入学习本 -> 持续更新用户水平。

## Current State Analysis

当前项目目录为 `/Users/bytedance/Desktop/project/native_reader`，不是空项目。关键已存在文件如下：

- `index.ts` 与 `App.tsx` 已作为应用入口，挂载导航容器。
- `src/navigation/AppNavigator.tsx` 当前只注册 `Home`，但多个屏幕已经依赖 `Camera`、`Reader`、`LearningGuide`、`Vocabulary`、`StudyBook`、`Settings` 路由。
- `src/screens/HomeScreen.tsx` 当前是静态首页，按钮没有真实 `onPress`，也没有读取数据库仪表盘数据。
- `src/screens/CameraScreen.tsx` 已支持相机权限、单页/多页模式、相册选图、图片压缩、调用 `performOCR()`，完成后跳转学习指导页。
- `src/screens/ReaderScreen.tsx` 已渲染 Markdown 和底部词汇栏，但 `selectedText` 没有来源，长按/滑动选词尚未实现。
- `src/screens/LearningGuideScreen.tsx` 已调用 `generateGuide(pageId)`，可把词汇标记为已掌握并进入阅读页。
- `src/screens/VocabularyScreen.tsx` 和 `src/screens/StudyBookScreen.tsx` 已实现词汇列表、搜索、筛选和状态切换 UI。
- `src/screens/SettingsScreen.tsx` 已实现 AI Provider 选择、API Key/Endpoint/Model 保存与测试连接。
- `src/database/schema.ts` 已定义 `books`、`pages`、`vocabulary_items`、`user_profiles`、`api_configs` 五张表。
- `src/database/index.ts` 已用 WatermelonDB + SQLiteAdapter 初始化数据库。
- `src/services/ocrService.ts` 已实现图片转 Base64、调用当前 AI Provider OCR、创建 Book 与 Page，并以 2 个任务为批次限制并发。
- `src/services/learningService.ts` 已实现 LLM 生成学习指导 JSON，并把难词/短语/习语写入学习本。
- `src/api/core/providerFactory.ts` 已根据当前激活配置创建火山、阿里云或 OpenAI 兼容 Provider。
- `src/api/providers/VolcengineProvider.ts` 已用火山方舟 OpenAI 兼容接口实现视觉 OCR、翻译和通用聊天。
- `src/api/providers/AliyunProvider.ts` 当前是骨架，方法未实现。

已经发现的主要缺口：

- `AppNavigator.tsx` 导航断链，未注册现有 Screen。
- `HomeScreen.tsx` 未接入导航和数据库统计。
- `pageService.ts` 的 `getPagesByBook(bookId)` 未按 `bookId` 过滤。
- `vocabularyService.ts` 的 `getByPage(pageId)` 未按 `pageId` 过滤。
- `apiConfigService.ts` 保存激活配置时可能保留多个 active Provider。
- `learningService.ts` 在 JSON 解析失败时将原响应作为 summary，这是容错路径，必须记录为异常，不作为正常降级策略。
- `package.json` 缺少 `test`、`typecheck` 等标准脚本。
- 阅读器核心选词需要原生底层方案，当前 `react-native-markdown-display` 只能作为临时渲染实现。

## Proposed Changes

### Todo 1: 串联现有 MVP 页面

改动文件不超过 3 个，完成后先向用户汇报并等待确认。

- `src/navigation/AppNavigator.tsx`
  - What: 扩展 `RootStackParamList`，注册 `Camera`、`Reader`、`LearningGuide`、`Vocabulary`、`StudyBook`、`Settings`。
  - Why: 当前 Screen 已存在但路由未注册，导致编译类型和运行时导航都无法闭环。
  - How: 引入现有 Screen 组件，定义参数：`Camera: { mode: 'single' | 'multi' }`，`Reader/LearningGuide/Vocabulary: { pageId: string }`，其余页面无参数。

- `src/screens/HomeScreen.tsx`
  - What: 添加单页拍照、多页连拍、学习本、设置入口，读取用户水平和词汇统计。
  - Why: 首页需要成为 OCR 与学习流程入口，而不是静态展示。
  - How: 使用 `useNavigation<NativeStackNavigationProp<RootStackParamList>>()`，调用 `getOrCreateProfile()`、`getStudyBook()`、`getBooks()` 计算当前水平、掌握词汇、学习中词汇和最近书籍。

- `src/services/apiConfigService.ts`
  - What: 确保保存某个 active Provider 时，其他配置的 `isActive` 被置为 false。
  - Why: `providerFactory.ts` 只应读取一个激活配置，多个 active 会导致 AI 调用不可预测。
  - How: 在同一个 `database.write()` 事务内更新旧配置并创建/更新当前配置。

验收方式：

- `npx tsc --noEmit`
- `npx expo export --platform ios`
- 手动检查首页按钮能进入相机、学习本和设置页。

### Todo 2: 修复服务层查询与学习统计

改动文件不超过 3 个，完成后先向用户汇报并等待确认。

- `src/services/pageService.ts`
  - What: `getPagesByBook(bookId)` 使用 WatermelonDB `Q.where('book_id', bookId)` 过滤。
  - Why: 当前返回所有页面，会污染最近阅读、书籍详情和多页阅读流程。
  - How: 从 `@nozbe/watermelondb` 引入 `Q`，保留现有函数签名。

- `src/services/vocabularyService.ts`
  - What: `getByPage(pageId)` 使用 `Q.where('page_id', pageId)` 过滤；`getStudyBook()` 保持全局返回，但排序按 `created_at` 倒序。
  - Why: 当前本页词汇列表会显示所有词汇，破坏学习本与单页词汇的边界。
  - How: 使用 `Q.where` 和 `Q.sortBy`，不改变调用方 API。

- `src/services/userProfileService.ts`
  - What: 在 `updateStats()` 中避免统计值变成负数，并为后续“掌握词汇变化联动水平”保留稳定入口。
  - Why: 用户反复切换状态时不能导致掌握数或学习数异常。
  - How: 用 `Math.max(0, old + delta)` 更新计数。

验收方式：

- 新增或更新针对 `getByPage()`、`getPagesByBook()`、`updateStats()` 的单元测试。
- `npx tsc --noEmit`
- `npx jest src/utils --runInBand`，如加入服务测试则运行对应测试文件。

### Todo 3: 明确底层选词架构并落地原型

这是核心逻辑与架构级改动，执行前需要单独向用户说明将发生的事情并等待批准。该 Todo 可能涉及超过 3 个文件，必须拆成子任务执行。

- `src/components/SelectableMarkdownView.tsx`
  - What: 新建 JS 侧包装组件，作为阅读器唯一入口。
  - Why: 隔离当前 `react-native-markdown-display` 与未来原生实现，避免 ReaderScreen 直接绑定某个渲染库。
  - How: 定义统一 props：`markdown`、`onSelection`、`onWordPress`、`highlights`、`style`。在原生组件尚未完成时，只保留临时 Markdown 渲染并明确标记为待替换，不把临时方案当成正常降级策略。

- `src/native/markdownSelection/types.ts`
  - What: 定义 `MarkdownSelection`、`VocabularyHighlight`、`SelectableMarkdownProps` 等类型。
  - Why: JS、iOS、Android 三侧共享选区数据模型。
  - How: 选区至少包含 `selectedText`、`start`、`end`、`paragraphIndex`、`source`。

- `ios/` 原生组件
  - What: 使用 Swift/Objective-C 实现 `SelectableMarkdownView`，用 `NSAttributedString` 表示富文本并基于 `UITextView` 或 TextKit 处理选择。
  - Why: iOS 原生选词体验成熟，可跨内联样式准确返回选中文本。
  - How: 支持标题、段落、粗体、斜体、列表、引用；选择后触发事件回传 JS。

- `android/` 原生组件
  - What: 使用 Kotlin/Java 实现 `SelectableMarkdownView`，用 `SpannableString` 表示富文本，并通过 `TextView`、`ActionMode` 或自定义 selection action 处理选区。
  - Why: Android 需要在底层处理选区和菜单，纯 React Native Text 无法稳定解决跨节点选择。
  - How: 支持同 iOS 的核心 Markdown 子集，回传 `selectedText/start/end`。

- `src/screens/ReaderScreen.tsx`
  - What: 替换现有 Markdown 组件为 `SelectableMarkdownView`，把选区直接接入翻译和加入未掌握逻辑。
  - Why: 当前 `selectedText` 没有赋值来源，阅读器核心功能未闭环。
  - How: `onSelection` 更新 `selectedText`，底部操作栏复用现有 `handleTranslateSelection()` 和 `addToVocabulary()`。

验收方式：

- iOS: 长按英文 Markdown 段落，拖动选择单词、短语、跨加粗文本，JS 收到准确 `selectedText`。
- Android: 同样场景下能选择并回传文本，若平台存在系统级限制，记录为 bug 并继续修复，不作为正常降级。
- `npx expo prebuild` 或开发构建能生成原生工程。
- `npx tsc --noEmit`

### Todo 4: 强化学习指导与词汇状态流

改动文件不超过 3 个，完成后先向用户汇报并等待确认。

- `src/services/learningService.ts`
  - What: 引入用户当前 CEFR（Common European Framework of Reference，欧洲语言共同参考框架，A1-C2 语言水平分级）到 Prompt。
  - Why: 学习指导必须“根据用户水平”找出难点，而不是固定难度。
  - How: 调用 `getOrCreateProfile()` 获取 `currentLevel`，Prompt 明确要求按该水平筛选难词、短语、习语。

- `src/services/vocabularyService.ts`
  - What: 标记词汇为 known/learning/unknown 时更新用户统计。
  - Why: 学习本状态变化需要持续更新对用户水平的认识。
  - How: 对 `updateStatus()` 增加旧状态比较，只有状态真实变化时更新统计。

- `src/utils/levelUtils.ts`
  - What: 复用现有水平工具函数，定义从学习统计到 CEFR 的可解释更新规则。
  - Why: 用户水平更新需要稳定、可测试。
  - How: 不引入黑盒降级策略，算法不足时记录为后续优化点。

验收方式：

- 标记“已掌握”后首页掌握词汇数增加。
- 生成学习指导时 Prompt 包含当前用户水平。
- 单元测试覆盖状态从 learning -> known、unknown -> known、known -> learning 等边缘情况。

### Todo 5: 工程脚本、测试与质量门禁

改动文件不超过 3 个，完成后先向用户汇报并等待确认。

- `package.json`
  - What: 添加 `test`、`typecheck`、`export:ios` 脚本。
  - Why: 当前存在 Jest 配置但没有标准运行入口，验收不稳定。
  - How: `test` 使用 `jest`，`typecheck` 使用 `tsc --noEmit`，`export:ios` 使用 `expo export --platform ios`。

- `jest.config.js`
  - What: 如服务测试需要，补充必要 mock 配置。
  - Why: WatermelonDB、Expo FileSystem、原生模块在 Jest 环境下可能需要 mock。
  - How: 优先最小 mock，不做大规模测试框架重构。

- `src/services/__tests__/...`
  - What: 增加聚焦测试，优先覆盖本次修复的查询过滤和词汇状态更新。
  - Why: 出现 bug 时先复现再修复，减少回归。
  - How: 使用 mock 数据库或轻量服务 mock，避免低价值快照测试。

验收方式：

- `npm run typecheck`
- `npm test`
- `npm run export:ios`

## Assumptions & Decisions

- 继续使用 Expo + React Native + TypeScript；但底层选词需要开发构建或 prebuild，不再假设 Expo Go 能覆盖完整功能。
- OCR（Optical Character Recognition，光学字符识别）当前通过火山方舟视觉模型实现，避免直接接入火山 OCR 签名流程；后续如需官方 OCR API，可单独规划 Provider 扩展。
- LLM（Large Language Model，大语言模型）输出 JSON 解析失败是异常路径，允许记录错误和提示用户重试，但不把“截取原响应当 summary”定义为正常降级。
- 阅读器选词以底层原生 `SelectableMarkdownView` 为目标方案；纯 `react-native-markdown-display` selectable、输入框粘贴、WebView 只可作为诊断或临时开发辅助，不作为产品主路径。
- 原生阅读器第一版只支持书页 OCR 常见 Markdown 子集：标题、段落、粗体、斜体、列表、引用；表格、代码块、图片、复杂 HTML 后续单独扩展。
- 每个 Todo 完成前先向用户汇报实际完成情况并等待确认，再进入下一个 Todo。
- 如果某个 Todo 预计修改超过 3 个文件，必须先拆成更小任务并说明影响范围。

## Verification

每个 Todo 的基本验收：

- 运行 TypeScript 类型检查：`npx tsc --noEmit` 或 `npm run typecheck`。
- 对涉及测试的改动运行 Jest：`npm test` 或对应测试文件。
- 对移动端打包链路运行：`npx expo export --platform ios`。
- 对阅读器原生选词，必须在 iOS 与 Android 各自验证长按、拖动、跨内联样式选择、取消选择、翻译、加入未掌握。
- 对 AI 调用，使用短文本或低成本图片进行真实火山 Provider 测试，并记录 API 失败、空响应、JSON 解析失败等边缘情况。

边缘案例与建议测试：

- 无 active API 配置时，拍照 OCR、翻译、学习指导应提示用户去设置页。
- OCR 返回空 Markdown 时，不创建无意义学习指导，提示重新拍摄。
- 多页 OCR 中某一页失败时，记录失败页并提示用户重试；不能静默丢页。
- `getByPage(pageId)` 只返回当前页词汇，不混入其他页面。
- 词汇从 known 切回 learning 时，统计不能变成负数。
- JSON 解析失败时记录异常并提示重试，不把错误响应当成正常学习指导。
- 原生选词跨加粗、斜体、链接文本时，`selectedText` 顺序与用户看到的文本一致。

## Risks

| 风险 | 影响 | 处理方式 |
|------|------|----------|
| 原生 `SelectableMarkdownView` 工程量大 | 需要改 `ios/` 和 `android/`，不能只靠 Expo Go | 先完成 JS 包装与事件契约，再分别实现 iOS/Android |
| RN 0.85 + Expo SDK 56 与第三方选词库兼容不确定 | 可能引入构建失败 | 优先自研最小原生组件；如引入库，先做独立原型验证 |
| Android 选区行为与厂商 ROM 差异 | 选词菜单和拖动手柄不一致 | 记录为 bug 并逐一修复，不把粘贴输入作为正常降级 |
| WatermelonDB 查询和测试环境复杂 | 服务测试可能需要 mock | 先覆盖纯服务逻辑和查询函数，再补充数据库集成测试 |
| AI 返回不稳定 JSON | 学习指导可能失败 | 加强 prompt 和响应校验；失败时提示重试并记录错误 |

## Implementation Log

### 2026-06-06

- 完成 Todo 1：注册现有页面路由，首页接入单页/多页拍照、学习本、设置入口和数据库仪表盘；Provider 保存时保证只有一个 active 配置。
- 完成 Todo 2：`getPagesByBook(bookId)` 和 `getByPage(pageId)` 使用 WatermelonDB 条件过滤；学习本按创建时间倒序；用户统计增加非负保护。
- 完成 Todo 3：按“直接原生”路线生成 `ios/` 和 `android/` 工程；实现 iOS `UITextView` + `NSAttributedString` 与 Android `TextView` + `SpannableString` 的原生 `SelectableMarkdownView`；`ReaderScreen` 已接入原生选区事件。
- 完成 Todo 4：学习指导 Prompt 已带入用户 CEFR 水平；LLM JSON 解析失败改为明确异常；词汇状态变化会更新已掌握统计并重新估算用户水平。
- 完成 Todo 5：添加 `test`、`typecheck`、`export:ios` 脚本；新增 `getKnownWordsDelta()` 聚焦单测，覆盖 known/learning/unknown 状态切换统计边界。
- 验证通过：`npm run typecheck`、`npm test -- --runInBand`、`npm run export:ios`、iOS Simulator Debug `xcodebuild`。
- 已知阻断：Android Gradle 编译因本机缺少 Java Runtime 失败，错误为 `Unable to locate a Java Runtime`；安装 JDK 后需继续运行 `./gradlew :app:assembleDebug -x lint`。
- 追加验收：修复 Android Markdown 内联样式重复文本时 span 定位可能错位的问题；再次验证 `npm run typecheck`、`npm test -- --runInBand`、`npm run export:ios`、iOS Simulator Debug `xcodebuild` 均通过。
- 环境确认：`/usr/libexec/java_home -V` 仍返回 `Unable to locate a Java Runtime`，Android 原生编译继续被本机 JDK 缺失阻断。
- Android 真机验证：安装 Homebrew `openjdk@17`，配置 `android/gradle.properties` 使用 JDK 17、本地 Android SDK、Kotlin `2.1.20` 与 `arm64-v8a` 单架构；生成非 dev 内嵌 Android bundle，`assembleDebug` 成功，APK 安装到真机成功，日志显示 `Running "main"` 与 WatermelonDB schema 初始化成功。
- Android 真机待继续：当前连接设备 `EP0110MZ0BB291436W` 处于锁屏状态，截图停留在锁屏页；需要手动解锁后继续页面导航、相机权限和原生选词交互测试。
- Android 桌面异常排查：用户看到的“一键锁屏”包名为 `com.obric.onetaplock`，本项目安装包为 `com.anonymous.native_reader`，启动 Activity 为 `com.anonymous.native_reader/.MainActivity`，两者不是同一个应用；`native_reader` 当前已在前台，但系统焦点停留在 `AlternateBouncerView` 生物识别解锁层。
- Android 相机入口修复：真机点击“单页拍照 / 选图”曾触发 `Rendered more hooks than during the previous render`，原因是 `CameraScreen` 的权限条件返回位于部分 hooks 之前；已将 hooks 移到任何条件返回之前，重新 `npm run typecheck`、生成非 dev 内嵌 bundle、重装 APK 后日志不再出现该错误。
- Android 相机冒烟通过：当前设备真实坐标为 `1264x2800`，之前按缩放截图坐标点击导致未命中按钮；改按 UIAutomator 节点真实中心点击后，`单页拍照 / 选图` 成功进入相机预览，拍照按钮成功进入“确认书籍信息”表单，显示书名、源语言、目标语言、页面缩略图和“开始识别”，日志未见 `Rendered more hooks` 或崩溃。
- Debug API 预置：新增本地忽略的 `.env.local` / `.env.debug.local` 存放 Debug-only 方舟配置，`.gitignore` 明确忽略本地 seed 文件；新增启动时 seed 服务，在没有 active Provider 时写入火山方舟 endpoint 与 `seed-2.0-mini` 对应模型 endpoint id，不覆盖用户已有配置，不在文档记录 API Key。
- Debug API 验证：`npm run typecheck` 和 IDE diagnostics 通过；`npx expo export:embed --platform android --dev false ...` 与 `./gradlew :app:assembleDebug -x lint` 均确认读取 `.env.local`，Debug APK 安装成功；启动后设备从 ADB 列表掉线，设置页 UI 预置值待重新连接设备后继续确认。
- Debug API 真机确认：重新连接设备后，设置页显示火山引擎已选中，endpoint 为 `https://ark.cn-beijing.volces.com/api/v3`，模型为 `ep-20260608121459-4brrg`，API Key 已以密码形式预置；点击“测试连接”最初暴露 WatermelonDB 装饰器转译错误 `Decorating class property failed`。
- Babel 装饰器修复：新增 `ApiConfig` 模型装饰器加载测试；显式配置 Babel 插件顺序为 TypeScript transform -> legacy decorators -> class properties/private features，修复 Android bundle 中 WatermelonDB legacy decorators 运行时错误；`npm test -- --runInBand`、`npm run typecheck`、Android `export:embed`、`assembleDebug`、APK 安装均通过。
- Debug API 连接通过：重装修复版 APK 后，设置页“测试连接”弹窗显示“测试成功 / API 连接正常”，日志未见 `Decorating class property failed`、`FATAL EXCEPTION` 或 `Debug API seed failed`。
- 真机 OCR 主流程：自动快门因相机未对准导致样张质量不可用，用户手动对准文章重测后，OCR、学习指导、页面创建、词汇生成均成功；Reader 显示第 1 页 OCR 原文，底部显示本页词汇 10 个。
- Reader 原生选词验证：Android 长按/拖选 OCR 原文可选中 `world`，底部出现“翻译 / 加入未掌握 / 取消”；点击“翻译”得到译文“世界”；点击“加入未掌握”弹出“已加入学习本”，本页词汇从 10 增加到 11。
- 已记录待优化：Reader 当前灰底白字对长时间阅读不友好，后续需要明亮模式、黑暗模式、护眼模式，以及更适合阅读的对比度、字号、行距和背景色策略。

### 2026-06-08

- 新增任务统筹完成：在原有词条统一标准与阅读页主题需求基础上，追加书籍落档、书架/书籍详情、书名合并、拍照入口合并、可选页码、AI 页码识别、LaTeX OCR/渲染、底部 Tab UI 改造等任务，并按依赖拆成数据地基、导航 UI、相机/OCR/公式、阅读主题、真机回归几个阶段。
- 数据地基完成：`books.cover_uri`、`pages.page_number` 可空、`vocabulary_items.translation` 等 schema/migration 已落地；`bookService` 支持同名书籍合并、最近书籍、封面更新、级联删除；`pageService` 支持无页码页面。
- 书架与导航完成：主界面改为底部 Tab，左侧“书架”包含学习本与最近阅读，中间为突出圆形拍照入口，右侧“我的”承载设置与关于；`HomeScreen` 不再展示无意义介绍标题；`BookDetailScreen` 支持进入书籍回顾与添加封面。
- 相机与 OCR 完成：单页/多页入口合并为一个拍照入口；拍照确认表单支持选择已有书籍、输入新书名、默认最近书籍、可选手动页码；OCR prompt 支持输出 Markdown + LaTeX + AI 识别页码，页码识别不到时保持 `null`，不做伪造降级。
- 公式渲染兼容修复：`react-native-math-view` 默认 Android 原生模块过旧，包含 `jcenter()` 且不适配新架构；已改为两端统一使用 MathJax -> SVG -> `react-native-svg` fallback，并通过 `package.json` 的 `expo.autolinking.exclude` 排除 `react-native-math-view` 原生 autolink，保留 `react-native-svg` 原生新架构支持。
- MathJax Hermes 修复：`mathjax-full` 在未提供 `PACKAGE_VERSION` 时会执行 `eval('require')` 读取 package.json，Hermes 无全局 `require` 会启动崩溃；新增入口 polyfill `src/polyfills/mathJaxPackageVersion.ts`，在 App 导入前设置 `globalThis.PACKAGE_VERSION = '3.2.1'`。
- 导航版本修复：`@react-navigation/bottom-tabs@7.17.0` 运行时依赖 `@react-navigation/native.createScreenFactory()`，但项目锁定 `@react-navigation/native@7.2.5`；已升级 `@react-navigation/native@7.3.0`、`@react-navigation/bottom-tabs@7.17.1`、`@react-navigation/native-stack@7.17.1`。
- 阅读主题完成：新增明亮、黑暗、护眼三套阅读主题；Android/iOS 原生 `SelectableMarkdownView` 支持 `textColor` 与 `readerBackgroundColor`；`ReaderScreen` 支持主题切换和持久化，正文、header、底栏、选词栏与公式颜色统一。
- Android 构建环境确认：系统 `java_home` 未登记 JDK，但本机存在完整 JDK 17 `/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home`；使用该 JDK 并加 `-Dorg.gradle.java.installations.auto-download=false` 可绕过 Gradle 9.3.1 + foojay toolchain resolver 的 `IBM_SEMERU` 兼容错误。
- Android 真机回归通过：`npm run typecheck` 零错误，`npm test -- --runInBand` 41 个测试全通过；`expo export:embed` 生成最新 Android bundle，`./gradlew :app:assembleDebug` 成功，APK 安装到设备 `EP0110MZ0BB291436W` 成功；书架、我的、拍照入口、书籍详情、阅读页、明亮/黑暗/护眼主题均已截图验证，logcat 未见新的 `FATAL EXCEPTION`、`TypeError`、`ReferenceError`、`Invariant Violation` 或 `RNMathView` 崩溃。
- 书籍管理与阅读笔记 A-1 数据地基：schema 升级到 v4，`books` 增加 `pinned_at`、`archived_at`、`sort_order`；新增 `book_tags`、`book_tag_assignments`、`book_lists`、`book_list_items`、`page_translations`、`annotations`、`page_notes` 表；类型层新增阅读模式、批注类型、书单/tag、页译文缓存、批注锚点、页/章/书笔记和 Markdown 包导出清单；`npm run typecheck` 与 IDE diagnostics 通过。
- 书籍管理与阅读笔记 A-2 模型注册：新增 `src/database/models/LibraryModels.ts`，集中定义 `BookTag`、`BookTagAssignment`、`BookList`、`BookListItem`、`PageTranslation`、`Annotation`、`PageNote`；`Book` 模型补充 `pinnedAt`、`archivedAt`、`sortOrder` 字段；`database/index.ts` 注册全部新增模型；`npm run typecheck` 与 IDE diagnostics 通过。
- 书籍管理与阅读笔记 A-3 service 层：新增 `bookOrganizationService.ts`（置顶/取消置顶、归档/恢复、设置排序）、`bookTagService.ts`（创建/读取标签、给书加/移除标签、读取某书标签）、`bookListService.ts`（创建/读取书单、加入/移除书籍、书单内排序、读取书单书籍）；重复加入关系保持幂等，找不到书/标签/书单时抛出错误；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 书籍管理 A-4 总页数与 ISBN 元信息地基：schema 升级到 v5，`books` 新增 `isbn`、`publisher`、`published_date`、`description`、`total_pages`、`metadata_json`；迁移 v5 同步新增上述字段；类型层扩展 `BookInput`、`BookSummary`，新增 `BookMetadata` 与 `BookReadingProgress`；`npm run typecheck` 与 IDE diagnostics 通过。
- ISBN 元信息 API 调研：国际侧优先 `Open Library`（无需 key、支持 ISBN 查询），Google Books 作为补充；国内侧国家图书馆/国家级数据更权威但通常需申请权限，豆瓣官方 API 已不适合作为稳定公开依赖，民间豆瓣/ISBN 聚合接口可作为用户可配置的可选 Provider，但需要缓存、来源标记和失败可见化，不能作为核心必需路径。
- 书籍管理 A-5 Book 模型与 service 兼容：`Book` 模型补充 ISBN、出版社、出版日期、简介、总页数和原始元信息 JSON 字段；`bookService.createBook()` 写入元信息、置顶/归档初始值和 `sortOrder`；同名书籍合并时只回填缺失元信息，不覆盖用户已有内容；`getRecentBooks()` 默认过滤归档书籍，按置顶时间、自定义排序、更新时间排序，并返回 `progressRatio` 供书架进度展示；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 国家级图书数据源渠道：`PDC 国家版本数据中心`（`https://pdc.capub.cn/`）可注册后按 ISBN/CIP/书名等检索，公开 API 需机构或商务对接确认；`全国图书馆联合编目中心 OLCC`（`https://olcc.nlc.cn/page/service.html`）提供成员馆书目数据下载与按 ISBN/统一书号检索服务，偏数据服务/批量检索而非公开 REST API；`中国国家版本馆 CIP 业务`与`书号实名申领系统`面向出版流程；后续应把国家级数据源做成可选权威 Provider，不阻塞 Open Library/Google Books 默认链路。
- 书籍管理 A-6 ISBN 元信息 service：新增 `bookMetadataService.ts`，实现 `normalizeISBN()`、`isValidISBN13()`、Open Library ISBN 查询、Google Books ISBN 查询、Open Library -> Google Books fallback、以及用户确认后的 `applyBookMetadata()` 本地写入；写入默认只回填空字段，不覆盖用户已有元信息；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。当前环境外网直连 Open Library/Google Books 探测超时，后续 UI 接入时需保留超时提示、重试和手动录入路径。
- 书籍管理 A-7 ISBN 元信息 service 测试：新增 `src/services/__tests__/bookMetadataService.test.ts`，覆盖 ISBN 归一化、ISBN-13 校验位、Open Library 响应归一化、Google Books 响应归一化、Open Library 未命中时 fallback 到 Google Books、无效 ISBN 不触发网络请求；为避免纯元信息测试初始化 WatermelonDB 原生 adapter，将 `applyBookMetadata()` 的数据库 import 延迟到函数内部；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过，测试数从 41 增加到 48。
- UI 设计上下文初始化：新增根目录 `PRODUCT.md`，记录 Native Reader 默认 register 为 product，产品定位为跨语言阅读学习工具，品牌性格为安静、专注、高效、陪伴、学习，并明确 WCAG AA 对比度、动态字号、减少动效和非纯颜色状态表达等可访问性原则。
- 书籍管理 B-1 书架 UI 接入：`BookCard` 展示置顶标记、已拍/总页数、阅读进度条和未录入总页数状态；`HomeScreen` 增加书架概览（本书数、已拍页、整体进度）和置顶提示；`BookDetailScreen` 展示置顶、已拍/总页数、进度条、ISBN、出版社、出版日期、总页数和简介，为后续 ISBN 补全与管理操作面板预留信息结构；本步只做展示接入，不写入置顶/归档状态，写入操作留到 B-2；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 书籍管理 B-2 操作面板：`BookDetailScreen` 新增“书籍管理”区域，接入已有 `bookOrganizationService`，支持置顶/取消置顶、归档/恢复；归档前弹窗确认，说明归档不会删除页面、笔记或词汇，只会从默认书架隐藏；`HomeScreen` 增加“显示归档/隐藏归档”切换，确保归档书籍有可恢复入口；`BookCard` 对归档书籍显示“已归档”标记并弱化透明度；本步未加入 tag/书单管理，留到后续小步；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 书籍管理 B-3a 独立标签管理页：用户选择独立页面方案后，将标签能力拆为 B-3a/B-3b，避免单步超过 3 个代码文件；本步新增 `BookTagManagementScreen`，注册 `BookTags` 路由，并在 `BookDetailScreen` 的“书籍管理”区域增加“管理标签”入口；标签页复用已有 `bookTagService`，支持创建标签、添加到当前书籍、从当前书籍移除，空标签名会提示错误；书架卡片展示标签和标签筛选留到 B-3b；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 书籍管理 B-3c 标签颜色编辑：用户要求标签支持颜色编辑后，先补齐颜色能力再继续书架展示；`bookTagService` 新增 `updateBookTagColor(tagId, color)`，校验颜色必须为 6 位十六进制值；`BookTagManagementScreen` 为每个标签增加颜色选择条，支持从蓝、绿、橙、紫、红、灰 6 个克制色中选择，更新后即时反映在标签圆点上；本步不改 schema，不做全局删除；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 书籍管理 B-3b 书架标签展示与筛选：`HomeScreen` 加载全部标签和每本书已绑定标签，支持按单个标签筛选当前书架列表，筛选后的书架统计、置顶提示、归档提示和空态都基于当前可见书籍计算；`BookCard` 展示每本书前 3 个标签，包含标签颜色圆点，超过 3 个时显示剩余数量；本步只改 `HomeScreen` 与 `BookCard`，不新增筛选页面；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 书籍管理 B-4a 书单服务层地基：根据用户补充的完整书单需求，将 B-4 重排为服务地基、书单总览、书单详情、多选添加几个小步；本步只改 `bookListService.ts`，新增 `BookListSummary`、`BookListUpdateInput`、`getBookListSummaries()`、`updateBookList()`、`deleteBookList()`、`setBookListSortOrder()`、`addBooksToList()`、`removeBooksFromList()`、`getBookIdsInList()`，为书单总览、排序、删除和批量添加 UI 提供统一接口；文件 187 行，未超过 200 行拆分阈值；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 书籍管理 B-4b 书单总览页：新增 `BookListOverviewScreen`，注册 `BookLists` 路由，并在 `HomeScreen` 增加“书单”入口；总览页支持创建书单、重命名、删除、上移/下移排序，并展示每个书单的书籍数量；书单详情和批量添加按拆分留到 B-4c/B-4d；新增页面压缩到 163 行，未超过 200 行拆分阈值；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 书籍管理 B-4c 书单详情页：新增 `BookListDetailScreen`，注册 `BookListDetail` 路由，并让书单总览页点击书单进入详情；因书单内排序需要 `book_list_items.id`，本步在用户批准下放宽到 4 文件，同时给 `bookListService` 增加 `BookListBookItem` 与 `getBookListItemsWithBooks()`；详情页支持查看书单内书籍、进入书籍详情、移出书单、书单内上移/下移排序；新增详情页 136 行，`bookListService` 压缩到 190 行，均未超过 200 行拆分阈值；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 书籍管理 B-4d 多选添加书籍到书单：新增 `BookListBulkAddScreen`，注册 `BookListBulkAdd` 路由，并在书单详情页增加“添加书籍”入口；多选页会隐藏已在当前书单内的书，支持按书名搜索、按标签筛选、勾选多本书后一次性调用 `addBooksToList()` 加入书单；空态会区分无可添加书或筛选无结果；新增页面 154 行，未超过 200 行拆分阈值；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 书籍管理 B-5 书架书单展示与筛选增强：`HomeScreen` 加载书单摘要和每个书单内的书籍 ID，构建每本书所属书单信息；首页新增书单筛选条，支持与标签筛选、归档显示组合使用；`BookCard` 展示每本书所属前 2 个书单，超过时显示剩余数量；本步只改 `HomeScreen` 与 `BookCard`，不改 schema/service；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。注意 `HomeScreen.tsx` 与 `BookCard.tsx` 已超过 200 行，后续建议单独拆分为更小组件/Hook，避免继续堆叠。
- 书架 UI 小范围拆分：新增 `useBookshelfData` Hook 承载首页书籍/标签/书单加载、组合筛选和统计计算；新增 `BookCardPills`、`BookshelfSummary`、`BookshelfFilters`、`BookshelfArchiveFilter`、`BookshelfEntryCard`、`BookshelfEmptyState` 等展示组件；`HomeScreen.tsx` 从 513 行降到 189 行，`BookCard.tsx` 从 301 行降到 195 行，新增文件均低于 200 行；本次只做组件拆分，不改变交互和 service/schema；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 阅读 C-1a 页译文缓存 service：新增 `pageTranslationService.ts`，实现 `createContentHash()`、`getCachedPageTranslation()` 与 `translatePageWithCache()`；缓存键采用 `pageId + language + sourceHash`，首次翻译当前页并写入 `page_translations`，后续命中同内容同语言时直接读取缓存；页面原文为空、语言为空、翻译结果为空都会抛错并作为异常处理，不静默降级；文件 91 行；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。
- 阅读 C-1b 原文/译文/双语切换：`ReaderScreen` 新增阅读模式状态，提供“原文 / 译文 / 双语”切换；切换到译文或双语时先调用 `translatePageWithCache(pageId, 'zh')`，生成并缓存当前页译文，后续命中缓存直接展示；双语模式上下展示原文和译文；翻译失败会弹窗提示，不静默显示旧译文或伪造内容；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand` 通过。注意 `ReaderScreen.tsx` 已增至 396 行，后续进入 C-2 前建议先拆分阅读页 Hook/子组件。
- 阅读 C-2a 词条高亮 JS 地基：`native/markdownSelection/types.ts` 新增 `tapVocabulary` action、`VocabularyHighlight`（text + status）与 `VocabularyTap`（text + source）；`SelectableMarkdownView` 与 `MathMarkdownView` 透传 `highlights` 数组和 `onVocabularyTap` 回调；公式分段时 highlights 全量传给每个文本段，由原生端按文本匹配定位；本步不改 schema、不改选词/翻译/加入学习本逻辑；`npm run typecheck` 通过。
- 阅读 C-2b 原生虚线下划线 + 单击：iOS `SelectableMarkdownNativeView.swift` 新增 `highlights` 属性，渲染后对每个词条文本全量匹配并加 `patternDash` 虚线下划线，新增 `UITapGestureRecognizer`（与长按选词共存）命中虚线词后 emit `onVocabularyTap`；Android `SelectableMarkdownView.kt` 新增 `setHighlights`，命中处加 `DashedUnderlineSpan` 标记 + `ClickableSpan`，并在 `onDraw` 按 span 范围逐行绘制真实虚线（避免系统实线降级），`LinkMovementMethod` 保证可点击且不破坏长按选词；两端 Manager 注册 `highlights` 属性与 `onVocabularyTap`/`topVocabularyTap` 事件；原生代码需真机回归验证手势冲突。
- 阅读 C-2c 阅读页接入 + 拆分：抽出 `useReaderPage` Hook（216 行）承载页面/词汇/主题/阅读模式/选词/页译文/气泡全部状态与逻辑，`ReaderScreen.tsx` 从 396 行降到 258 行（主体为 JSX 与 styles）；新增 `components/reader/VocabularyTapBubble.tsx` 半透明小气泡，单击虚线词条直接展示学习本已缓存译文（无缓存译文显示“该词条暂无译文”），不发起新翻译请求；highlights 由本页词汇映射，原文与双语原文段都接入虚线 + 单击；`npm run typecheck`、IDE diagnostics、`npm test -- --runInBand`（48 通过）全通过。

### C-3 高亮/划线/评论 架构决策（2026-06-11）

- 背景问题（架构级）：当前原生 `SelectableMarkdownView.renderMarkdown` 会有损清洗 markdown 标记（删 `#`/`**`/`*`/`>`，`- ` 换成 `• `），导致原生选词回调返回的 `start/end` 是“清洗后渲染纯文本偏移”；而 `MathMarkdownView` 又叠加 segment 的“原文偏移” `baseOffset`，最终偏移是“混合坐标”，既非纯原文偏移也非纯渲染偏移。后果：`addToVocabulary` 用 `extractSentenceByRange(page.markdownContent, start, end)` 在原文里取句，只要原文带 markdown 标记就会错位（现存潜在 bug，仅因测试文本无标记未暴露）；高亮/划线需要精确区间重绘，在混合坐标上无法做对。
- 决策（用户确认“以原生最优为准，不为兼容现状委屈求全”）：把【原文 markdown 偏移】确立为唯一锚点坐标系。原生渲染器升级为渲染时维护一张【渲染字符 ↔ 原文字符】映射表：选词回调把渲染区间反查成原文区间再返回 JS（顺带修复取句错位 bug）；高亮/划线绘制时 JS 传原文偏移区间，原生正查成渲染区间并用 layout 精确绘制；公式分段 baseOffset 语义改为“segment 局部原文偏移”。annotation 锚点 = 原文 offset（主）+ selectedText/prefix/suffix 原文快照（原文变化时兜底重定位）。词条虚线（C-2）保持“同词文本匹配全标”不变。
- 验证策略（用户要求）：先开独立分支 `feature/c3-annotations`，对 Android 端做最小化端到端验证（真机 `EP0110MZ0BB291436W` 已连接），确认“原文偏移映射 + 高亮精确绘制”架构在真机成立后，再继续补齐 iOS、评论面板与完整 C-3 能力。验证通过前不合并回 main。
- 分步（放宽文件数，多文件改完后自行 review）：C-3a `annotationService` + 偏移映射工具；C-3b 原生渲染器升级（Android 先行：映射表 + 选词反查 + annotation 正查绘制 + 命中回调）；C-3c 阅读页接入（选词栏高亮/划线/评论按钮、评论编辑面板、useReaderPage 状态）；中间插入 Android 真机最小化 e2e 验证关卡。

### C-3 Android 端到端架构验证（2026-06-11，分支 feat/annotation-anchor）

- 实际分支名为 `feat/annotation-anchor`（非决策记录里的占位名）。已落地最小化验证版本：
  - 原生 Android `SelectableMarkdownView.kt` 重写（441 行，超阈值，待验证通过后抽 `MarkdownRenderer.kt`）：`renderMarkdown` 构建 `renderToSource: IntArray`（渲染后第 i 个字符 → 原文下标，每 append 一个字符就 add 一次，长度严格等于渲染文本长度）；`emitSelection` 经 `renderToSourceRange` 把渲染区间反查为原文区间后返回 JS；新增 `setAnnotations` 接收【原文偏移】区间，`sourceToRenderRange` 正查渲染区间，`onDraw` 分三层绘制（高亮背景在文字下、词条虚线和划线在文字上），跨行用 `forEachLineRect` 逐行求像素矩形。
  - Manager 注册 `annotations` 属性；JS 侧 `types.ts` 新增 `AnnotationRange`，`SelectableMarkdownView`/`MathMarkdownView` 透传 `annotations`；`useReaderPage` 加本地 `annotations` 状态与 `highlightSelection()`（暂未落库，仅验证）；`ReaderScreen` 选词栏加“高亮”按钮、原文段接入 `annotations`。
  - 构建链路确认：debug APK 内嵌 `android/app/src/main/assets/index.android.bundle`（优先于 Metro），故 JS 改动必须先 `expo export:embed --dev false` 重新生成内嵌 bundle，再 `assembleDebug` + 安装，否则真机跑旧 JS。
- 真机 `EP0110MZ0BB291436W` 验证结果（截图逐项确认）：①App 编译/安装/启动无 FATAL；②C-2 词条虚线在新架构下完好（quest/world/govern/dawn of humanity 等均有虚线）；③长按选词正常、选词栏出现“高亮”按钮；④点“高亮”后黄色高亮精确覆盖所选区间——验证了「选词返回原文偏移 → 传回原生 → sourceToRenderRange 正查 → onDraw 逐行绘制」全链路，单词级（"The"）与跨行整段（"1.1 The quest for the forces that shape the world"）均精确对齐、无错位无溢出；⑤高亮颜色正确（#FFEB3B），收起选区后单词高亮持久保留。
- 结论：原文偏移 ↔ 渲染映射 + layout 精确绘制架构在 Android 真机成立。待办（完整阶段）：annotation 落库后从 DB 加载（解决多段高亮叠加持久性）、抽 `MarkdownRenderer.kt` 降行数、补 iOS 端同样的映射改造、阅读页完整高亮/划线/评论 UI 与评论编辑面板、公式分段下 annotations 的 segment 偏移切分。

### C-3 高亮/划线/评论完整流程（2026-06-13）

- 完整落地范围：
  - 新增 `annotationService.ts`，基于 WatermelonDB `annotations` 表实现高亮、划线、评论的创建、查询、更新和删除；批注锚点统一保存为原文 markdown 偏移，并附带 `selectedText/prefixText/suffixText` 快照。
  - 新增 `useReaderAnnotations`，负责按页加载批注、生成原生绘制用 `AnnotationRange[]`、创建高亮/划线/评论、编辑评论、删除批注和维护当前激活批注。
  - `ReaderScreen` 增加“高亮 / 划线 / 评论”选词操作；新增 `CommentEditorModal` 和 `AnnotationDetailSheet`，支持添加评论、编辑评论、删除批注、关闭详情。
  - `MathMarkdownView` 在 LaTeX 分段场景下按 segment 裁剪 annotations，保证每个 `SelectableMarkdownView` 接收局部原文偏移，避免公式段影响批注定位。
  - Android 原生 `SelectableMarkdownView.kt` 支持 `annotations`、`onAnnotationTap`、高亮背景绘制、划线绘制和批注点击命中；抽出 `MarkdownRenderer.kt` 承载 Markdown 渲染与 `renderToSource` 映射，避免主视图继续膨胀。
  - iOS 原生 `SelectableMarkdownNativeView.swift` 同步升级为原文偏移映射架构，批注以 `NSAttributedString` 的背景色/下划线属性绘制，并支持 `onAnnotationTap`。
- Android 真机验证：
  - 设备：`EP0110MZ0BB291436W`。
  - 评论保存：点击 `knowledge` 划线批注打开详情，点击“添加评论”，输入 `test-note` 并保存；再次点击同一批注，详情面板显示“划线 / knowledge / test-note”，确认评论保存与详情展示成功。
  - 删除批注：通过详情面板“删除”删除带 `test-note` 的批注，随后查询真机 DB，确认对应记录消失；再次删除同文本的历史 `knowledge` 划线记录后，DB 只剩早前长区间划线记录，证明删除 CRUD 生效。中途设备前台被第三方应用打断，未将被污染的 UI 状态作为结论，而是重新拉起 App 并用 DB 取证。
  - 高亮落库：长按选中 `universe` 后点击“高亮”，DB 新增 `highlight` 记录，偏移为 `96..104`，颜色 `#FFEB3B`。
  - 选词栏清理 bug 修复：发现创建高亮后原生迟到的 `selectionChanged` 会把 JS 选词栏重新带回。按 TDD 新增 `readerSelectionSuppression.test.ts`，先确认迟到事件未被抑制时测试失败，再新增 `readerSelectionSuppression.ts` 并在 `useReaderPage` 中用 `selectionClearedAtRef` 忽略清理选区后 350ms 内的普通 `selectionChanged`；显式 `translate/addToVocabulary` 菜单动作不被抑制。重打 bundle/APK 后真机验证点击“高亮”后控件树不再出现 `选中:`、`高亮`、`评论` 操作栏。
  - 测试数据清理：经用户批准后，先强停 App、备份真机 DB 到 `/tmp/native_reader_db_check/backup_20260613_163959`，再只删除测试高亮记录 `m3Yg8B7GoffhEQRM` 并回写；最终 DB 查询确认只剩一条早前长区间划线记录。
- 构建与质量门禁：
  - `npm run typecheck` 通过。
  - `npm test -- --runInBand` 通过：8 个测试套件、51 个测试全部通过。
  - IDE diagnostics 为空。
  - `npx expo export:embed --platform android --dev false --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res` 通过。
  - `JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home ./gradlew :app:assembleDebug -Dorg.gradle.java.installations.auto-download=false` 通过。
  - `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` 成功。
- 当前结论：
  - C-2 学习本词条虚线与点击气泡在 C-3 原生改造后保留。
  - C-3 的高亮、划线、评论、详情、编辑评论、删除、DB 持久化、Android 原生点击命中和选词栏清理已完成闭环验证。
  - iOS 代码已同步实现原文偏移映射与批注绘制/点击，但本轮没有 iOS 真机或模拟器回归；后续进入 iOS 验收时必须验证长按选词、批注绘制、批注点击、评论编辑和删除。
- 建议后续边缘测试：
  - 带 `#`、`**bold**`、`*italic*`、列表、引用的 Markdown 上创建批注，确认原文偏移不受清洗影响。
  - 多行跨段高亮/划线的点击命中和删除。
  - 公式分段前后文本批注，确认 segment 裁剪不越界。
  - 同一区间重叠多个批注时的命中优先级和详情切换策略。
  - 原文发生变化后的 `selectedText/prefixText/suffixText` 重定位策略，目前已存快照但尚未实现自动重定位。

### C-3 iOS 编译与启动验证（2026-06-13）

- 初次验证命令：`xcodebuild -workspace ios/nativereader.xcworkspace -scheme nativereader -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17' build`。
- 初次结果：构建失败，`.xcresult` 指向 `SelectableMarkdownNativeView.swift:64`，Swift 编译错误为 `@objc var textColor: NSString` 与 `UITextView.textColor: UIColor?` 父类属性冲突；普通 xcodebuild 文本日志未展示具体 error，需要读取 result bundle issue summary 才定位到根因。
- 修复方式：保持 JS 侧 `textColor` prop 不变；Swift 侧把属性改名为 `markdownTextColor`，ObjC Manager 使用 `RCT_REMAP_VIEW_PROPERTY(textColor, markdownTextColor, NSString)` 映射，从而避免覆盖 `UITextView.textColor`。
- 验证结果：
  - `xcodebuild -workspace ios/nativereader.xcworkspace -scheme nativereader -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17' build` 通过。
  - `xcrun simctl install 'iPhone 17' .../nativereader.app` 成功。
  - `xcrun simctl launch 'iPhone 17' com.anonymous.native-reader` 成功，返回进程号 `37351`。
  - 模拟器日志显示应用进入 `running-active`，未见 `Fatal` 或 `RCTFatal` 启动期崩溃。
  - `npm run typecheck`、`npm test -- --runInBand`（51 个测试）、IDE diagnostics 均通过。
- 当前边界：本轮确认 iOS C-3 原生代码可编译并可启动；尚未在 iOS 模拟器/真机中手动完成阅读页长按选词、批注绘制、批注点击、评论编辑和删除交互回归，后续仍需专项验证。

### C-3 iOS 阅读页自动进入与批注绘制验证（2026-06-14）

- 背景：iOS Release app 可启动，但模拟器本地书架为空；普通 shell 无权直接写入 `~/Library/Developer/CoreSimulator/...` App 容器 DB，macOS `System Events click at` 被权限 `-25204` 拦截，低层 `CGEvent` 鼠标事件也未能可靠触发 Simulator 内点击。
- 为继续验证阅读页，新增 debug-only 测试数据能力：
  - `debugContentSeedService.ts` 提供 `buildDebugReaderSeedFixture()`，构造固定测试书 `Debug C3 Annotation Test`、1 页 Markdown、2 个词条（`universe` / `knowledge`）和 2 条批注（`universe` 高亮、`knowledge` 评论）。
  - seed 只在 `EXPO_PUBLIC_DEBUG_API_SEED_ENABLED=true` 时运行，并且如果同名测试书已存在则跳过，避免重复写入。
  - 新增本地忽略文件 `src/config/debugFlags.local.ts`，仅包含非敏感调试布尔值 `openReaderOnStart: true`，用于本机 iOS 自动打开测试 Reader；`.gitignore` 已忽略该文件。
  - `App` 等待 debug seed 完成后再渲染导航；`AppNavigator` 在有 `initialReaderPageId` 时以 `Reader` 作为初始路由，避免 `NavigationContainer.onReady()` 与 DB seed 的异步竞态。
- 验证结果：
  - `npm run typecheck` 通过。
  - `npm test -- src/services/__tests__/debugContentSeedService.test.ts --runInBand` 通过；随后全量测试通过（9 个 suites，53 个 tests）。
  - iOS Release 构建通过：`xcodebuild -workspace ios/nativereader.xcworkspace -scheme nativereader -configuration Release -destination 'platform=iOS Simulator,name=iPhone 17' build`。
  - 安装并启动 Release app 后自动进入 Reader 页；截图确认标题、正文、阅读模式 tab、底部词汇栏均正常。
  - iOS 批注绘制视觉确认：`universe` 显示黄色高亮，`knowledge` 显示黄色高亮并带下划线，底部本页词汇数为 2，说明 iOS 原文偏移映射、annotation 属性绘制和 JS->native 透传在静态渲染层成立。
- 未完成项：
  - 自动化点击 `knowledge` 未弹出详情，原因是当前环境无法可靠向 Simulator 注入点击事件；不能据此判定 iOS `onAnnotationTap` 失败。
  - iOS 长按选词、点击批注详情、评论编辑、删除批注仍需人工模拟器点击或真机操作继续验证。

### C-3 iOS 批注点击 XCUITest 验证（2026-06-14）

- 新增最小 XCUITest target：
  - 新建 `ios/nativereaderUITests/nativereaderUITests.swift`，验证 debug seed 自动进入 Reader 后点击 `knowledge` 批注并出现详情内容。
  - 手动补齐 `ios/nativereader.xcodeproj/project.pbxproj` 中 `nativereaderTests` UI Test target、sources/resources/frameworks phases、target dependency、Debug/Release build configurations，并保持 scheme 的 `TestAction` 指向该 target。
- 调试过程与根因：
  - 首次 `xcodebuild ... test` 从 “There are no test bundles available to test” 推进到真实执行 XCUITest，证明 target 挂载成功。
  - Debug TestAction 会走 Metro/dev bundle，容易触发此前 `.env.debug.local` RedBox；本轮统一用 Release configuration 验证内嵌 bundle。
  - 进一步排查确认，`-project ios/nativereader.xcodeproj` 会绕过 CocoaPods 导致 `Expo.modulemap not found`，而当前机器也不存在 `iPhone 16` simulator；这两类失败均属于环境/命令误用，不应误判为 C-3 逻辑回退。稳定门禁命令固定为 `-workspace ios/nativereader.xcworkspace -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.3.1'`。
  - 窗口坐标点击最初未命中，随后通过 XCUITest accessibility tree 确认 `knowledge` 的真实 frame，并发现 `UITextView` link delegate 在 iOS 26 环境下不适合作为自动化断言主路径。
  - 中间曾尝试透明 `UIButton` hit target，XCUITest 可点击且能打开详情，但审查发现会覆盖已批注文本并破坏长按选词，因此已撤销。
  - 最终采用 TextKit 精确矩形命中：`SelectableMarkdownNativeView` 在短点击手势中用 `NSLayoutManager` 将批注字符范围映射到 glyph bounding rect，只在点击点落入真实批注文字矩形时回传 `annotationId`；不再依赖 `UITextView` link delegate，也不叠加透明控件，从而保留长按选词触摸路径。
  - JS 侧 `useReaderAnnotations.openAnnotation()` 改为读取最新 `annotationsRef`，避免原生事件回调保留旧闭包时在空 annotations state 中查不到 id。
  - 为验证“已批注文本仍可长按选词”，新增 XCUITest 红灯 `testLongPressingSeededKnowledgeAnnotationKeepsSelectionWithoutOpeningDetailSheet`；初次复现出长按 `knowledge` 会误开详情。最终修复是在 iOS native 点击处理里，当 `selectedRange` 已存在有效选区时，直接退出批注点击判定，避免长按选词结束被误识别为短点击。
  - 为验证评论编辑与删除，新增组合 XCUITest `testEditingThenDeletingSeededKnowledgeAnnotationComment`。初次红灯显示 `AnnotationDetailSheet` 和 `CommentEditorModal` 在 iOS accessibility tree 中发生聚合，`编辑评论 / 删除 / 保存` 无法被单独定位；随后只做最小可访问性修复：两层外部聚合容器显式 `accessible={false}`，评论输入框增加 `accessibilityLabel="评论输入框"`，操作按钮显式暴露为 `button`。
  - 评论 CRUD 后续还有一轮“假红灯”：第一次打开详情、编辑、保存都成功，但 `openSeededKnowledgeAnnotationDetail()` 仍用旧评论文案 `Debug note for iOS annotation tap.` 作为打开成功判定，导致保存新评论后误报 `Failed to open seeded knowledge annotation detail`。最终将 helper 判定改为详情面板稳定按钮（`编辑评论 / 删除 / 关闭`）存在性，不再依赖评论正文文本。
  - 组合测试还暴露出 debug seed 污染问题：删除 `knowledge` 评论后，后续重跑若继续复用旧 seed 记录，会让用例互相污染。最终在 `debugContentSeedService.ts` 中约束本地 `openReaderOnStart` 也触发 seed reset；查询时过滤 WatermelonDB `_status = 'deleted'` 记录；fixture annotations 改为串行创建，消除 reset/重建后的脏数据与丢写疑点。
- 验证结果：
  - 单条回归 `testEditingThenDeletingSeededKnowledgeAnnotationComment` 已在修复 helper 后转绿；随后执行全量门禁 `xcodebuild -workspace ios/nativereader.xcworkspace -scheme nativereader -configuration Release -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.3.1' -derivedDataPath ios/build-debug-evidence-release -resultBundlePath ios/TestResults_UI_All_workspace.xcresult -only-testing:nativereaderTests/nativereaderUITests test`，当前 `nativereaderUITests` 共 3 条测试全绿：
    - `testTappingSeededKnowledgeAnnotationShowsDetailSheet`
    - `testLongPressingSeededKnowledgeAnnotationKeepsSelectionWithoutOpeningDetailSheet`
    - `testEditingThenDeletingSeededKnowledgeAnnotationComment`
  - XCUITest 点击 `knowledge` 文字中心坐标后出现包含 `评论, knowledge, Debug note for iOS annotation tap., 编辑评论, 删除, 关闭` 的详情容器；测试用 `label CONTAINS` 断言详情 note 文案，避免 React Native 聚合 label 导致 exact match 误判。
  - XCUITest 长按 `knowledge` 后不会再弹详情，且会出现以 `选中:` 开头的选词相关文本，证明已批注文字仍可进入选词路径。
  - 长按断言优化：在原有“出现选中态且不弹详情”的基础上，进一步断言选词栏 label 包含 `knowledge`，避免仅出现任意 `选中:` 文案就误判通过。单条长按 XCUITest 已通过。
  - XCUITest 可完成评论编辑、保存、重新打开详情确认新评论、删除批注后再次点击不再出现该评论详情。
  - 稳定选择器优化：为 `AnnotationDetailSheet` 和 `CommentEditorModal` 补充 `testID`，XCUITest 从中文按钮文案切换到 `reader-annotation-detail-sheet`、`reader-annotation-edit-comment`、`reader-annotation-delete`、`reader-comment-editor-input`、`reader-comment-editor-save` 等稳定标识。先运行旧组件下的新选择器测试确认红灯，再补最小实现并回归单条点击详情与 3 条全量 iOS Release XCUITest，均通过；当前仍保留真实文本坐标点击，不引入 debug-only hook。
  - 评论编辑清空策略优化：移除固定 30 个退格的测试写法，新增 XCUITest helper 从 `reader-comment-editor-input.value` 读取当前文本长度，按实际长度生成 delete key 序列后再输入新评论。单条 `testEditingThenDeletingSeededKnowledgeAnnotationComment` 已通过，避免 debug seed 初始评论文案变长/变短时造成假失败。
  - 评论边界用例补充：新增空评论、长评论、多行评论 3 条 XCUITest。空评论覆盖 `评论为空 / 请输入评论内容。` alert 且确认编辑器保持打开；长评论覆盖较长 note 保存并在详情中展示；多行评论覆盖换行文本保存并在详情中展示第二行。随后 `nativereaderUITests` 共 6 条 iOS Release XCUITest 全量通过，结果包为 `ios/TestResults_CommentEdgeCases_All.xcresult`。
  - 重叠批注命中规则明确为“更具体的短区间优先；长度相同则起点更靠后优先”。debug seed 新增覆盖 `knowledge` 的长区间高亮，用于复现“长高亮覆盖短评论”场景；新增 `testTappingOverlappedSeededKnowledgeAnnotationPrefersShortComment`，先确认旧命中顺序会让短评论详情断言红灯，再在 iOS 原生 `annotationId(at:)` 中按区间长度升序、起点降序排序 hit-test 候选。修复后单条重叠用例通过，`nativereaderUITests` 共 7 条 iOS Release XCUITest 全量通过，结果包为 `ios/TestResults_Overlap_All.xcresult`。
  - `npm run typecheck` 通过。
  - `npm test -- --runInBand` 通过：9 个 suites，54 个 tests。
  - 最近编辑文件的 IDE diagnostics 为空，其中 `ios/nativereaderUITests/nativereaderUITests.swift` 已显式检查无诊断。
- 当前结论：
  - iOS C-3 的批注静态绘制、点击批注打开详情、已批注文本长按选词不误开详情、评论编辑、删除批注，均已完成 XCUITest 自动化闭环验证。
  - 用户已确认当前阶段暂不考虑 iOS 真机验证；后续优化优先级转为继续降低 UI 自动化脆弱性，包括去固定退格、加强长按选中内容断言、补空/长/多行评论和重叠批注用例。

### C-3 iOS 验证 Cookbook（2026-06-22）

- 标准入口：
  - `npm run verify:ios-c3`
- 脚本位置：
  - `scripts/verify-ios-c3.sh`
- 脚本固定执行三段门禁：
  - `npm run typecheck`
  - `npm test -- --runInBand`
  - `xcodebuild -workspace ios/nativereader.xcworkspace -scheme nativereader -configuration Release -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.3.1' -derivedDataPath ios/build-debug-evidence-release -only-testing:nativereaderTests/nativereaderUITests test`
- 默认结果包：
  - `ios/TestResults_C3_iOS_<timestamp>.xcresult`，使用时间戳避免覆盖历史结果包。
- 可覆盖环境变量：
  - `IOS_C3_DESTINATION`：替换 simulator destination，例如不同本机设备名或 OS 版本。
  - `IOS_C3_DERIVED_DATA_PATH`：替换 DerivedData 路径，避免并行任务抢 `build.db`。
  - `IOS_C3_RESULT_BUNDLE_PATH`：替换 `xcresult` 输出路径。
- 已知假失败规避：
  - 必须用 `ios/nativereader.xcworkspace`，不要用 `ios/nativereader.xcodeproj`，否则会绕过 CocoaPods 并出现 Expo modulemap 缺失。
  - 当前标准 simulator 是 `iPhone 17,OS=26.3.1`；若本机无该设备，先用 `xcodebuild -showdestinations -workspace ios/nativereader.xcworkspace -scheme nativereader` 确认可用 destination，再通过 `IOS_C3_DESTINATION` 覆盖。
  - 避免并行跑多个 iOS `xcodebuild` 共享同一个 `ios/build-debug-evidence-release`，否则可能出现 `build.db locked`；需要并行时给每条命令设置不同 `IOS_C3_DERIVED_DATA_PATH`。

### C-3 跨平台规则合同（2026-06-22）

- 目标：C-3 不能让 iOS/Android 各自定义批注语义；共享规则层定义产品行为，原生模块只做平台外围实现。
- 共享规则模块：
  - `src/utils/annotationHitTesting.ts`
  - 配套测试：`src/utils/__tests__/annotationHitTesting.test.ts`
- 当前已固定的跨平台命中优先级：
  - 点击位置命中多条批注时，更具体的短区间优先。
  - 区间长度相同时，`startOffset` 更靠后的批注优先。
  - 区间长度和起点都相同时，保留输入顺序，避免无意义重排。
- 平台职责边界：
  - JS/TS 规则层负责定义排序 contract，并用 Jest 测试保护。
  - iOS/Android 原生层负责把触摸坐标转成渲染偏移、把原文 offset 正查到渲染区间，并按同一 contract 做候选排序。
  - 原生层不能自行发明与共享规则冲突的业务语义。
- 当前状态：
  - 共享规则层与 Jest contract 已落地。
  - iOS 原生 hit-test 已按同一规则实现，并有 XCUITest 覆盖重叠场景；当前实现显式保留完全相同区间的输入顺序。
  - Android 原生 `SelectableMarkdownView.kt` 已接入同一排序语义，点击命中不再依赖数组顺序 `firstOrNull`，而是先按共享 contract 排序后再做 hit-test。
  - 两端原生代码都保留指向 `src/utils/annotationHitTesting.ts` 的注释，后续调整规则时必须先改共享 contract 和 Jest，再同步原生外围。
- 小步 B 验证口径：
  - JS 规则层：`npm run typecheck`、`npm test -- --runInBand`。
  - Android 外围：`JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home ./gradlew :app:assembleDebug -Dorg.gradle.java.installations.auto-download=false`。
  - iOS 外围：`npm run verify:ios-c3`，覆盖 typecheck、Jest 和 7 条 Release XCUITest。
- 小步 B 验证结果：
  - `npm run typecheck` 通过。
  - `npm test -- --runInBand` 通过：10 个测试套件、57 个测试全部通过。
  - Android `:app:assembleDebug` 通过；仅保留 Gradle deprecation 提醒，未出现编译错误。
  - `npm run verify:ios-c3` 通过；7 条 iOS Release XCUITest 全部通过，结果包为 `ios/TestResults_C3_iOS_20260622_190635.xcresult`。

### C-3 Android 真机重叠批注命中验证（2026-06-25）

- 设备：`EP0110MZ0BB291436W`，`adb devices -l` 状态为 `device`。
- 验证构建：
  - 重新执行 `npx expo export:embed --platform android --dev false --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res`，生成最新内嵌 bundle。
  - 重新执行 `JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home ./gradlew :app:assembleDebug -Dorg.gradle.java.installations.auto-download=false`，`BUILD SUCCESSFUL`。
  - 执行 `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` 成功，并通过 `am start -n com.anonymous.native_reader/.MainActivity` 启动。
- 页面状态：
  - UIAutomator 层级确认已进入 debug seed Reader：存在 `第1页`、原文正文、`本页词汇: 2`。
  - 证据截图：`.trae/evidence/android_c3_reader.png`。
- 数据证据：
  - 从真机 `run-as com.anonymous.native_reader` 拉取 `native_reader.db`、`native_reader.db-wal`、`native_reader.db-shm` 后查询 `annotations`。
  - 设备端存在重叠记录：
    - 长区间高亮：`How may this knowledge help us to comprehend the world and hence guide`，`start_offset=129`，`end_offset=199`。
    - 短区间评论：`knowledge`，`start_offset=142`，`end_offset=151`，`note_text=Debug note for iOS annotation tap.`。
- 运行时命中证据：
  - 点击 `knowledge` 文字中心后，UIAutomator 层级出现 `评论`、`knowledge`、`Debug note for iOS annotation tap.`、`编辑评论`、`删除`、`关闭`。
  - 结论：Android 真机在长高亮覆盖短评论的重叠位置，命中短区间评论，符合共享规则 `src/utils/annotationHitTesting.ts`。
  - 证据截图：`.trae/evidence/android_c3_overlap_comment_detail.png`。
- 日志检查：
  - 启动与点击后检查最近 logcat，未见 `FATAL EXCEPTION`、`TypeError`、`ReferenceError`、`Invariant Violation` 或 `RCTFatal`。
- 边界记录：
  - 首轮补测曾出现“点击长高亮非 `knowledge` 区域未弹详情”的现象，但当时点击点位没有经过截图定点，不能据此判定为逻辑 bug。
  - 随后按“前台校验 + 页面关键字校验 + 截图定点 + 单次点击”的约束流程，点击长高亮第二行中部（避开 `knowledge` 重叠区）后，UIAutomator 层级出现 `高亮`、长区间选中文本、`添加评论`、`删除`、`关闭`，说明 Android 长高亮详情链路本身可打开。
  - 当前更合理的结论是：此前未弹详情更可能是点击坐标未稳定落在可命中像素区域，而不是“高亮类型不支持打开详情”。
  - 证据截图：`.trae/evidence/android_probe_before.png`、`.trae/evidence/android_probe_after_single.png`。

### C-3 Android 最小真机验证入口（2026-06-25）

- 新增最小版入口：
  - `npm run verify:android-c3-min`
  - 脚本位置：`scripts/verify-android-c3-min.sh`
- 适用范围：
  - 仅当前设备 `EP0110MZ0BB291436W`
  - 仅当前 debug seed Reader 页面
  - 仅当前页面布局和当前分辨率
- 当前固定坐标：
  - 重叠评论命中：`557,1092`
  - 非重叠长高亮命中：主点位 `700,988`，fallback 点位 `750,1044`
- 脚本行为：
  - 运行 `npm run typecheck`
  - 运行 `npm test -- --runInBand`
  - 重新生成 Android 内嵌 bundle
  - 重新 `assembleDebug`、安装 APK、拉起 Reader
  - 校验前台 Activity 和 Reader 关键字后，执行一次评论点击与一次高亮点击
  - 将截图、UI dump 和执行摘要输出到时间戳 evidence 目录
- 输出位置：
  - 默认目录：`.trae/evidence/android_verify_<timestamp>/`
  - 关键产物：
    - `summary.txt`
    - `reader_before_comment.*`
    - `comment_after_detail.*`
    - `reader_before_highlight_primary.*`
    - `highlight_after_primary.*`
    - fallback 命中时额外生成 `reader_before_highlight_fallback.*`、`highlight_after_fallback.*`
- 已知边界：
  - 该脚本未做分辨率适配、OCR 定位、动态坐标推导或多设备兼容。
  - 如果设备、系统字号、顶部状态栏高度、Reader 布局或 debug seed 文本发生变化，需要重新校准固定坐标。
  - 如果系统出现 `AlternateBouncerView` 生物识别遮罩（如“面部、指纹识别中”/“指纹传感器”），脚本会明确报错并终止；这类失败属于设备交互环境阻断，不代表 C-3 逻辑回退。

### 阶段性收尾与发布边界（2026-06-26）

- GitHub 仓库目标：
  - 仓库名：`native-reader`
  - 可见性：公开
- 脱敏策略：
  - `.env.local`、`.env.debug.local`、`src/config/debugFlags.local.ts` 继续仅保留本地，不入库。
  - 新增忽略项覆盖 Android 内嵌 bundle、Android 构建目录、iOS build / xcresult、`.trae/evidence/`，避免把本地生成物和带环境差异的验证产物提交到 GitHub。
- Debug / Release 分离：
  - 本地 debug 构建继续允许读取本机 `.env.local`，保留 debug API seed 预置行为，便于本地验证。
  - Android release 构建新增入口：`npm run build:android-release`
  - 该入口在 bundling 和 `assembleRelease` 前显式设置 `EXPO_NO_DOTENV=1`、`EXPO_NO_CLIENT_ENV_VARS=1`，并将 `EXPO_PUBLIC_DEBUG_*` 变量置空或置为 `false`，避免把本机 debug API key / endpoint / model 打进 release bundle。根据 Expo 官方文档，`EXPO_NO_DOTENV=1` 可禁用 `.env` 文件加载，`EXPO_NO_CLIENT_ENV_VARS=1` 可禁用 `EXPO_PUBLIC_` 客户端变量内联。
- Release APK 边界：
  - 当前 Android `release` 变体仍使用 `signingConfigs.debug`，因此可以产出 release 变体 APK，但它不是面向应用商店的正式签名包。
  - 当前阶段 GitHub Release 上传的是“本地 release 变体 APK”，用于阶段性交付和分发验证；若后续要面向应用商店发布，需要用户提供正式 keystore 并切换 signing config。
