# Android Release Signing Guide

本项目的 Android release 构建已经强制要求提供正式签名材料。
未配置 `NATIVE_READER_RELEASE_*` 时，`npm run build:android-release` 会立即失败。

## 目标

- release 包不读取本地 `.env.local`
- release 包不内联 `EXPO_PUBLIC_DEBUG_*`
- release 包必须使用用户自己的正式 keystore

## keystore 放置约定

推荐两种方式，二选一：

1. 放在仓库外的绝对路径，例如：
   - `/Users/you/secure/native-reader-release.keystore`
2. 放在仓库内但不入库的本地目录：
   - `android/keystores/native-reader-release.keystore`

注意：

- `*.keystore` 已被 `.gitignore` 忽略，不会提交到仓库。
- `android/app/build.gradle` 中使用的是 `file(releaseStoreFileProp)`，相对路径会相对 `android/app/` 解析。
- 因此如果 keystore 放在 `android/keystores/`，属性值应写成 `../keystores/native-reader-release.keystore`，不是 `keystores/...`。

## 方式 A：本地 shell 环境变量

```bash
export NATIVE_READER_RELEASE_STORE_FILE=/absolute/path/to/native-reader-release.keystore
export NATIVE_READER_RELEASE_STORE_PASSWORD=replace_with_store_password
export NATIVE_READER_RELEASE_KEY_ALIAS=replace_with_key_alias
export NATIVE_READER_RELEASE_KEY_PASSWORD=replace_with_key_password

npm run build:android-release
```

适用场景：

- 本地一次性构建
- 不想把 secrets 写进任何文件

## 方式 B：Gradle properties

可以把签名配置写到以下任一位置：

- 用户级：`~/.gradle/gradle.properties`
- 项目级本地文件：`android/gradle.properties`

推荐优先使用用户级 `~/.gradle/gradle.properties`。

模板见：

- `android/gradle.properties.release.example`

示例内容如下：

```properties
NATIVE_READER_RELEASE_STORE_FILE=/absolute/path/to/native-reader-release.keystore
NATIVE_READER_RELEASE_STORE_PASSWORD=replace_with_store_password
NATIVE_READER_RELEASE_KEY_ALIAS=replace_with_key_alias
NATIVE_READER_RELEASE_KEY_PASSWORD=replace_with_key_password
```

如果 keystore 放在仓库内的 `android/keystores/`：

```properties
NATIVE_READER_RELEASE_STORE_FILE=../keystores/native-reader-release.keystore
NATIVE_READER_RELEASE_STORE_PASSWORD=replace_with_store_password
NATIVE_READER_RELEASE_KEY_ALIAS=replace_with_key_alias
NATIVE_READER_RELEASE_KEY_PASSWORD=replace_with_key_password
```

## CI Secrets 约定

CI 中直接注入同名环境变量即可：

- `NATIVE_READER_RELEASE_STORE_FILE`
- `NATIVE_READER_RELEASE_STORE_PASSWORD`
- `NATIVE_READER_RELEASE_KEY_ALIAS`
- `NATIVE_READER_RELEASE_KEY_PASSWORD`

如果 CI 平台只能保存文件内容而不是文件路径，建议流程如下：

1. 将 keystore 二进制作为安全文件或 base64 secret 保存。
2. 在 CI 运行时写入临时文件。
3. 把临时文件绝对路径注入 `NATIVE_READER_RELEASE_STORE_FILE`。
4. 再执行 `npm run build:android-release`。

## 验收步骤

1. 未配置签名变量时执行：

```bash
npm run build:android-release
```

预期结果：

- 立即失败
- 错误中包含 `release signing is not configured`

2. 配置正式签名后再次执行：

```bash
npm run build:android-release
```

预期结果：

- `npm run typecheck` 通过
- `npm test -- --runInBand` 通过
- `:app:assembleRelease` 成功
- APK 产物位于 `android/app/build/outputs/apk/release/app-release.apk`

3. 可选校验签名证书：

```bash
apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk
```

预期结果：

- 输出正式 keystore 对应证书信息
- 不再是默认 debug 证书

## 常见失败原因

- `NATIVE_READER_RELEASE_STORE_FILE` 写成了相对 `android/` 的路径，实际会被 `android/app/build.gradle` 按 `android/app/` 解析。
- keystore 文件存在，但 alias 或密码错误。
- 在 CI 中只注入了密码，没有先把 keystore 文件落盘。
- 误以为 `v1.0.0` GitHub Release 中的 APK 可以直接上架。当前该资产明确是 debug-signed release variant，不是正式商店包。
