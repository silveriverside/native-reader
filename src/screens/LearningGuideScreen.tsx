import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { generateGuide } from '@/services/learningService';
import { updateStatus, getByPage } from '@/services/vocabularyService';
import type { LearningGuide as LearningGuideType, VocabularyItem } from '@/types';

export default function LearningGuideScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'LearningGuide'>>();
  const { pageId } = route.params;

  const [guide, setGuide] = useState<LearningGuideType | null>(null);
  const [loading, setLoading] = useState(true);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);

  useEffect(() => {
    loadGuide();
  }, [pageId]);

  const loadGuide = async () => {
    setLoading(true);
    try {
      const result = await generateGuide(pageId);
      setGuide(result);
      const vocab = await getByPage(pageId);
      setVocabulary(vocab);
    } catch (error) {
      Alert.alert('生成失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const markKnown = async (item: VocabularyItem) => {
    await updateStatus(item.id, 'known');
    const updated = await getByPage(pageId);
    setVocabulary(updated);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>正在生成学习指导...</Text>
      </View>
    );
  }

  if (!guide) {
    return (
      <View style={styles.center}>
        <Text>生成失败</Text>
        <TouchableOpacity onPress={loadGuide}>
          <Text style={styles.retry}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allItems = [
    ...guide.difficultWords.map((w) => ({ ...w, type: 'word' as const, key: w.word })),
    ...guide.phrases.map((p) => ({ ...p, type: 'phrase' as const, key: p.phrase })),
    ...guide.idioms.map((i) => ({ ...i, type: 'idiom' as const, key: i.idiom })),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>学习指导</Text>
        <TouchableOpacity onPress={() => navigation.replace('Reader', { pageId })}>
          <Text style={styles.back}>开始阅读</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {guide.summary.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>摘要</Text>
            <Text style={styles.summary}>{guide.summary}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>重点内容 ({allItems.length})</Text>
          {allItems.map((item) => {
            const vocabItem = vocabulary.find((v) => v.content === item.key);
            const isKnown = vocabItem?.status === 'known';
            return (
              <View key={item.key} style={[styles.itemCard, isKnown && styles.knownCard]}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemWord}>{item.key}</Text>
                  <Text style={styles.itemType}>{item.type}</Text>
                </View>
                <Text style={styles.itemExplanation}>{item.explanation}</Text>
                {'context' in item && item.context && (
                  <Text style={styles.itemContext}>上下文: {item.context}</Text>
                )}
                {!isKnown && (
                  <TouchableOpacity onPress={() => vocabItem && markKnown(vocabItem)}>
                    <Text style={styles.knownBtn}>已掌握</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {guide.previewQuestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>预习问题</Text>
            {guide.previewQuestions.map((q, idx) => (
              <Text key={idx} style={styles.question}>{idx + 1}. {q}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  retry: { color: '#007AFF', marginTop: 12, fontSize: 15 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  back: { color: '#007AFF', fontSize: 15 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
  summary: { fontSize: 14, color: '#444', lineHeight: 22 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  knownCard: { opacity: 0.5 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemWord: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  itemType: { fontSize: 12, color: '#007AFF', backgroundColor: '#E6F4FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  itemExplanation: { fontSize: 13, color: '#555', lineHeight: 20 },
  itemContext: { fontSize: 12, color: '#999', marginTop: 4, fontStyle: 'italic' },
  knownBtn: { color: '#34C759', fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'right' },
  question: { fontSize: 14, color: '#444', marginBottom: 6 },
});
