# native-reader

跨语言阅读辅助 App，基于 React Native + Expo，包含 OCR、阅读模式、批注（高亮 / 划线 / 评论）、学习指导与词汇积累能力。

## 仓库与发布

- GitHub 仓库：
  - `https://github.com/silveriverside/native-reader`
- GitHub Release：
  - `https://github.com/silveriverside/native-reader/releases/tag/v1.0.0`

## 当前阶段能力

- iOS C-3 批注点击 / 长按 / 评论 CRUD 自动化验证
- Android C-3 最小真机验证脚本
- C-3 跨平台批注命中规则合同
- Android release 变体 APK 本地构建与 GitHub Release 上传

## Debug 与 Release 边界

### Debug（仅本地）

- 本地 debug 构建允许读取 `.env.local`
- 本地 debug 构建允许使用 `EXPO_PUBLIC_DEBUG_*` 变量做 debug API seed
- 这些本地变量文件已被 `.gitignore` 忽略，不会提交到仓库

### Release（面向分发）

- `npm run build:android-release` 会显式禁用：
  - `.env` / `.env.local` 自动加载
  - `EXPO_PUBLIC_` 客户端变量内联
- 这样可以避免把本机 debug API key / endpoint / model 打进 release bundle
- 用户应在 App 设置页中自行配置 AI provider / API key

## Android 验证入口

- iOS C-3：
  - `npm run verify:ios-c3`
- Android 最小真机验证：
  - `npm run verify:android-c3-min`
- Android release 构建：
  - `npm run build:android-release`

## Android release 签名配置

当前仓库已经禁止在未配置正式 keystore 时继续 release 构建。

完整接入手册见：

- [docs/android-release-signing.md](file:///Users/bytedance/Desktop/project/native_reader/docs/android-release-signing.md)
- `android/gradle.properties.release.example`

构建前请先设置以下环境变量：

```bash
export NATIVE_READER_RELEASE_STORE_FILE=/absolute/path/to/your-release.keystore
export NATIVE_READER_RELEASE_STORE_PASSWORD=your_store_password
export NATIVE_READER_RELEASE_KEY_ALIAS=your_key_alias
export NATIVE_READER_RELEASE_KEY_PASSWORD=your_key_password
```

然后执行：

```bash
npm run build:android-release
```

如果 keystore 放在仓库内但不入库的 `android/keystores/`，请注意 `android/app/build.gradle` 会按 `android/app/` 解析相对路径，因此属性值要写成 `../keystores/your-release.keystore`。

## 当前已知限制

- 当前 GitHub Release 中的 `v1.0.0` APK 是在本地生成的 Android release 变体。
- 如果未接入正式 keystore，则不能作为应用商店正式上架包。
- Android 最小真机验证脚本当前只适配指定设备和当前 debug seed 页面布局。
