import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

interface RowProps {
  glyph: string;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  onPress: () => void;
}

function SettingRow({ glyph, iconBg, iconColor, title, desc, onPress }: RowProps) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Text style={[styles.iconText, { color: iconColor }]}>{glyph}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>我的</Text>

        <View style={styles.group}>
          <SettingRow
            glyph="⚙"
            iconBg="#E6F0FF"
            iconColor="#007AFF"
            title="设置"
            desc="配置 AI Provider、密钥与模型"
            onPress={() => navigation.navigate('Settings')}
          />
          <View style={styles.divider} />
          <SettingRow
            glyph="ⓘ"
            iconBg="#EAF7EE"
            iconColor="#27AE60"
            title="关于"
            desc="了解 Native Reader"
            onPress={() => navigation.navigate('About')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 18,
  },
  group: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  rowText: {
    flex: 1,
    marginLeft: 14,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  rowDesc: {
    fontSize: 13,
    color: '#8A8F99',
  },
  chevron: {
    fontSize: 24,
    color: '#C4C9D1',
    fontWeight: '300',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ECEEF1',
    marginLeft: 54,
  },
});
