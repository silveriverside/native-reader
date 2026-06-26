import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { VocabularyItem, VocabularyStatus } from '@/types';

interface Props {
  item: VocabularyItem;
  onChangeStatus?: (id: string, status: VocabularyStatus) => void;
}

const statusLabel: Record<VocabularyStatus, string> = {
  known: '已掌握',
  learning: '学习中',
  unknown: '未掌握',
};

const statusColor: Record<VocabularyStatus, string> = {
  known: '#34C759',
  learning: '#FF9500',
  unknown: '#FF3B30',
};

const actionColor: Record<VocabularyStatus, string> = statusColor;

export default function VocabularyItemCard({ item, onChangeStatus }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.content}>{item.content}</Text>
        <Text style={[styles.badge, { color: statusColor[item.status] }]}>
          {statusLabel[item.status]}
        </Text>
      </View>

      {item.translation ? (
        <Text style={styles.translation}>{item.translation}</Text>
      ) : (
        <Text style={styles.translationMissing}>译文缺失（待修复的旧数据）</Text>
      )}

      {item.contextSentence ? (
        <Text style={styles.context}>“{item.contextSentence}”</Text>
      ) : (
        <Text style={styles.contextMissing}>原句缺失（待修复的旧数据）</Text>
      )}

      {item.explanation ? (
        <Text style={styles.explanation}>{item.explanation}</Text>
      ) : null}

      {onChangeStatus && (
        <View style={styles.actions}>
          {(['known', 'learning', 'unknown'] as VocabularyStatus[])
            .filter((s) => s !== item.status)
            .map((s) => (
              <TouchableOpacity key={s} onPress={() => onChangeStatus(item.id, s)}>
                <Text style={[styles.action, { color: actionColor[s] }]}>
                  {statusLabel[s]}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  content: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  badge: { fontSize: 12, fontWeight: '600' },
  translation: { fontSize: 14, color: '#1A1A1A', marginBottom: 6 },
  translationMissing: { fontSize: 12, color: '#FF3B30', marginBottom: 6 },
  context: { fontSize: 13, color: '#555', fontStyle: 'italic', marginBottom: 6 },
  contextMissing: { fontSize: 12, color: '#FF9500', marginBottom: 6 },
  explanation: { fontSize: 13, color: '#666', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  action: { fontSize: 14, fontWeight: '600' },
});
