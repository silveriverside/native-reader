import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { getAllConfigs, saveConfig } from '@/services/apiConfigService';
import { clearProviderCache } from '@/api/core/providerFactory';
import { getActiveAIProvider } from '@/api/core/providerFactory';
import type { AIProviderType } from '@/types';

const PROVIDERS: { key: AIProviderType; label: string }[] = [
  { key: 'volcengine', label: '火山引擎' },
  { key: 'aliyun', label: '阿里云' },
  { key: 'openai', label: 'OpenAI 兼容' },
];

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [provider, setProvider] = useState<AIProviderType>('volcengine');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [modelName, setModelName] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [provider]);

  const loadConfig = async () => {
    const configs = await getAllConfigs();
    const found = configs.find((c) => c.provider === provider);
    if (found) {
      setApiKey(found.apiKey);
      setApiSecret(found.apiSecret ?? '');
      setEndpoint(found.endpoint ?? '');
      setModelName(found.modelName ?? '');
    } else {
      setApiKey('');
      setApiSecret('');
      setEndpoint('');
      setModelName('');
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('错误', '请输入 API Key');
      return;
    }
    await saveConfig({
      provider,
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim() || undefined,
      endpoint: endpoint.trim() || undefined,
      modelName: modelName.trim() || undefined,
      isActive: true,
    });
    clearProviderCache();
    Alert.alert('保存成功');
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await handleSave();
      const ai = await getActiveAIProvider();
      const result = await ai.chatCompletion([
        { role: 'user', content: 'Say OK' },
      ]);
      if (result.toLowerCase().includes('ok')) {
        Alert.alert('测试成功', 'API 连接正常');
      } else {
        Alert.alert('测试完成', `返回: ${result.slice(0, 100)}`);
      }
    } catch (error) {
      Alert.alert('测试失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>AI 提供商</Text>
        <View style={styles.providerRow}>
          {PROVIDERS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.providerBtn, provider === p.key && styles.providerBtnActive]}
              onPress={() => setProvider(p.key)}
            >
              <Text style={[styles.providerText, provider === p.key && styles.providerTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>API Key</Text>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="输入 API Key"
          placeholderTextColor="#999"
          secureTextEntry
        />

        <Text style={styles.label}>API Secret (可选)</Text>
        <TextInput
          style={styles.input}
          value={apiSecret}
          onChangeText={setApiSecret}
          placeholder="输入 API Secret"
          placeholderTextColor="#999"
          secureTextEntry
        />

        <Text style={styles.label}>Endpoint (可选)</Text>
        <TextInput
          style={styles.input}
          value={endpoint}
          onChangeText={setEndpoint}
          placeholder={`默认: ${
            provider === 'volcengine'
              ? 'https://ark.cn-beijing.volces.com/api/v3'
              : provider === 'openai'
              ? 'https://api.openai.com/v1'
              : ''
          }`}
          placeholderTextColor="#999"
          autoCapitalize="none"
        />

        <Text style={styles.label}>模型名称 (可选)</Text>
        <TextInput
          style={styles.input}
          value={modelName}
          onChangeText={setModelName}
          placeholder="留空使用默认模型"
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>保存配置</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.testBtn, testing && { opacity: 0.6 }]}
          onPress={handleTest}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>测试连接</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
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
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
  providerRow: { flexDirection: 'row', marginBottom: 16 },
  providerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginRight: 10,
  },
  providerBtnActive: { backgroundColor: '#007AFF' },
  providerText: { fontSize: 14, color: '#666' },
  providerTextActive: { color: '#fff', fontWeight: '600' },
  label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  testBtn: { backgroundColor: '#34C759', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
