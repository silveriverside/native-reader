import * as FileSystem from 'expo-file-system/legacy';

const COVERS_DIR = `${FileSystem.documentDirectory}covers/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(COVERS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(COVERS_DIR, { intermediates: true });
  }
}

/**
 * 把选取/拍摄的临时封面图片持久化到 app 文档目录，返回持久化后的 file:// URI。
 * ImagePicker / 相机返回的是缓存目录中的临时文件，重启后可能被清理，必须落盘。
 */
export async function persistCover(sourceUri: string, bookId: string): Promise<string> {
  await ensureDir();
  const ext = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
  const target = `${COVERS_DIR}${bookId}_${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: target });
  return target;
}
