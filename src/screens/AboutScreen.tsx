import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const FEATURES = [
  {
    glyph: '📷',
    title: '拍照识别',
    desc: '拍摄纸质书页面，自动 OCR 识别文字内容。',
  },
  {
    glyph: '🤖',
    title: 'AI 学习指导',
    desc: '生成生词、短语、习语讲解与预读问题，辅助跨语言阅读。',
  },
  {
    glyph: '📚',
    title: '学习本',
    desc: '收集生词与短语，按掌握状态分类复习。',
  },
];

export default function AboutScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>关于</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>NR</Text>
          </View>
          <Text style={styles.appName}>Native Reader</Text>
          <Text style={styles.tagline}>跨语言阅读辅助助手</Text>
        </View>

        <Text style={styles.intro}>
          Native Reader 帮助你阅读外语纸质书：拍照识别页面文字，借助 AI 生成生词、短语与习语讲解，
          并把不熟悉的内容沉淀到学习本里，逐步提升阅读水平。
        </Text>

        {FEATURES.map((item) => (
          <View key={item.title} style={styles.featureCard}>
            <Text style={styles.featureGlyph}>{item.glyph}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.version}>版本 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  back: {
    fontSize: 17,
    color: '#007AFF',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  navSpacer: {
    width: 56,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#8A8F99',
  },
  intro: {
    fontSize: 15,
    lineHeight: 24,
    color: '#5A6068',
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  featureGlyph: {
    fontSize: 26,
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: '#8A8F99',
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    color: '#B0B5BD',
    marginTop: 24,
  },
});
