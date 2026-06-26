import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function BookshelfEmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.icon}>📖</Text>
      <Text style={styles.title}>书架还是空的</Text>
      <Text style={styles.desc}>点击下方圆形按钮拍一页，开始阅读吧</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  desc: {
    fontSize: 14,
    color: '#8A8F99',
    textAlign: 'center',
  },
});
