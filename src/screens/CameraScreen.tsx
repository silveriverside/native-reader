import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { performOCR, type OCRJob } from '@/services/ocrService';
import { getRecentBooks } from '@/services/bookService';
import type { BookSummary, BookInput } from '@/types';
import { compressImage } from '@/utils/imageUtils';
import CaptureConfirmForm, {
  type CaptureItem,
  type BookMode,
} from '@/components/CaptureConfirmForm';

declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_BOOK_TITLE =
  process.env.EXPO_PUBLIC_DEBUG_API_SEED_ENABLED === 'true' ? 'Debug OCR Test' : '';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 书籍归属相关
  const [recentBooks, setRecentBooks] = useState<BookSummary[]>([]);
  const [bookMode, setBookMode] = useState<BookMode>(DEFAULT_BOOK_TITLE ? 'new' : 'existing');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState(DEFAULT_BOOK_TITLE);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('zh');

  // 加载最近书籍：默认选中最近更新的第一本；空书架则进入新建模式。
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const books = await getRecentBooks();
        if (!active) return;
        setRecentBooks(books);
        if (books.length > 0) {
          setSelectedBookId(books[0].id);
          // 没有 debug 默认书名时，默认走「选已有书」并选中最近一本
          if (!DEFAULT_BOOK_TITLE) {
            setBookMode('existing');
          }
        } else {
          setBookMode('new');
        }
      } catch {
        if (active) setBookMode('new');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const takePicture = useCallback(async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        const compressed = await compressImage(photo.uri, 1200);
        setCaptures((prev) => [...prev, { uri: compressed, manualPage: '' }]);
      }
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = await Promise.all(result.assets.map((a) => compressImage(a.uri, 1200)));
      setCaptures((prev) => [...prev, ...uris.map((uri) => ({ uri, manualPage: '' }))]);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setCaptures((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const changePageNumber = useCallback((index: number, value: string) => {
    // 仅保留数字，避免伪造非法页码
    const digits = value.replace(/[^0-9]/g, '');
    setCaptures((prev) =>
      prev.map((item, i) => (i === index ? { ...item, manualPage: digits } : item))
    );
  }, []);

  const goToForm = useCallback(() => {
    if (captures.length === 0) {
      Alert.alert('提示', '请先拍照或选择图片');
      return;
    }
    setShowForm(true);
  }, [captures.length]);

  const startOCR = useCallback(async () => {
    if (captures.length === 0) {
      Alert.alert('提示', '请先拍照或选择图片');
      return;
    }

    let bookInput: BookInput;
    if (bookMode === 'existing') {
      const book = recentBooks.find((b) => b.id === selectedBookId);
      if (!book) {
        Alert.alert('提示', '请选择一本书籍');
        return;
      }
      // 选已有书：复用其语言，落库时 findOrCreateBook 按同名命中合并
      bookInput = {
        title: book.title,
        sourceLang: book.sourceLang,
        targetLang: book.targetLang,
      };
    } else {
      if (!bookTitle.trim()) {
        Alert.alert('提示', '请输入书名');
        return;
      }
      bookInput = { title: bookTitle.trim(), sourceLang, targetLang };
    }

    setIsProcessing(true);
    try {
      const jobs: OCRJob[] = captures.map((item) => {
        const trimmed = item.manualPage.trim();
        // 手动页码优先；留空则交给 AI 识别（manualPageNumber 为 null）
        const manualPageNumber = trimmed === '' ? null : Number(trimmed);
        return {
          imageUri: item.uri,
          manualPageNumber: Number.isNaN(manualPageNumber as number) ? null : manualPageNumber,
        };
      });
      const { pages } = await performOCR(jobs, bookInput);
      navigation.replace('LearningGuide', { pageId: pages[0].id });
    } catch (error) {
      Alert.alert('OCR 失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsProcessing(false);
    }
  }, [captures, bookMode, recentBooks, selectedBookId, bookTitle, sourceLang, targetLang, navigation]);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>需要相机权限</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>授权相机</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showForm) {
    return (
      <CaptureConfirmForm
        captures={captures}
        recentBooks={recentBooks}
        mode={bookMode}
        selectedBookId={selectedBookId}
        bookTitle={bookTitle}
        sourceLang={sourceLang}
        targetLang={targetLang}
        isProcessing={isProcessing}
        onSetMode={setBookMode}
        onSelectBook={setSelectedBookId}
        onChangeTitle={setBookTitle}
        onChangeSourceLang={setSourceLang}
        onChangeTargetLang={setTargetLang}
        onChangePageNumber={changePageNumber}
        onRemoveImage={removeImage}
        onContinueShooting={() => setShowForm(false)}
        onSubmit={startOCR}
      />
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <SafeAreaView style={styles.overlay} edges={['top']}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.iconText}>关闭</Text>
            </TouchableOpacity>
            <Text style={styles.modeText}>拍摄</Text>
            <TouchableOpacity onPress={pickFromLibrary}>
              <Text style={styles.iconText}>相册</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={styles.bottomBar}>
          {captures.length > 0 && (
            <TouchableOpacity style={styles.doneBtn} onPress={goToForm}>
              <Text style={styles.doneBtnText}>完成 ({captures.length})</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.shutterBtn} onPress={takePicture}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <Text style={styles.countText}>已拍 {captures.length} 张</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  permissionText: { fontSize: 16, marginBottom: 16, color: '#333' },
  camera: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  iconText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modeText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  doneBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  countText: { color: '#fff', fontSize: 13, marginTop: 10 },
  button: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
