import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BookshelfArchiveFilterProps {
  archivedCount: number;
  showArchived: boolean;
  onToggle: () => void;
}

export default function BookshelfArchiveFilter({
  archivedCount,
  showArchived,
  onToggle,
}: BookshelfArchiveFilterProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.text}>
        {showArchived ? `已显示 ${archivedCount} 本归档书籍` : '默认隐藏归档书籍'}
      </Text>
      <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={onToggle}>
        <Text style={styles.buttonText}>{showArchived ? '隐藏归档' : '显示归档'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: '#5A6068',
  },
  button: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#EAF3FF',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066CC',
  },
});
