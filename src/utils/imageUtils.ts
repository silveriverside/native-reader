import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export async function compressImage(
  uri: string,
  maxWidth = 1200
): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return manipulated.uri;
}

export async function getFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? info.size : 0;
}
