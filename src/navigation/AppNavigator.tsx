import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import HomeScreen from '@/screens/HomeScreen';
import CameraScreen from '@/screens/CameraScreen';
import ReaderScreen from '@/screens/ReaderScreen';
import LearningGuideScreen from '@/screens/LearningGuideScreen';
import VocabularyScreen from '@/screens/VocabularyScreen';
import StudyBookScreen from '@/screens/StudyBookScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import AboutScreen from '@/screens/AboutScreen';
import BookDetailScreen from '@/screens/BookDetailScreen';
import BookListBulkAddScreen from '@/screens/BookListBulkAddScreen';
import BookListDetailScreen from '@/screens/BookListDetailScreen';
import BookListOverviewScreen from '@/screens/BookListOverviewScreen';
import BookTagManagementScreen from '@/screens/BookTagManagementScreen';

export type RootStackParamList = {
  Main: undefined;
  Camera: { mode?: 'single' | 'multi' } | undefined;
  Reader: { pageId: string };
  LearningGuide: { pageId: string };
  Vocabulary: { pageId: string };
  StudyBook: undefined;
  Settings: undefined;
  About: undefined;
  BookDetail: { bookId: string };
  BookListBulkAdd: { bookListId: string };
  BookListDetail: { bookListId: string };
  BookLists: undefined;
  BookTags: { bookId: string };
};

export type MainTabParamList = {
  BookShelf: undefined;
  CameraTab: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/** 中间凸出的圆形拍照按钮，点击直接跳转到相机页（而非切换 Tab）。 */
function CameraTabButton({ children }: BottomTabBarButtonProps) {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.cameraButtonWrap} pointerEvents="box-none">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="拍照"
        activeOpacity={0.85}
        style={styles.cameraButton}
        onPress={() => navigation.navigate('Camera')}
      >
        {children ?? <Text style={styles.cameraButtonPlus}>＋</Text>}
      </TouchableOpacity>
    </View>
  );
}

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <Text style={[styles.tabIcon, focused ? styles.tabIconActive : styles.tabIconInactive]}>
      {glyph}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8A8F99',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="BookShelf"
        component={HomeScreen}
        options={{
          title: '书架',
          tabBarIcon: ({ focused }) => <TabIcon glyph="▣" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="CameraTab"
        component={CameraPlaceholder}
        options={{
          title: '',
          tabBarButton: (props) => <CameraTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => <TabIcon glyph="◑" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

/** 占位组件：CameraTab 永远不会真正展示（点击被 tabBarButton 拦截跳转到 Camera）。 */
function CameraPlaceholder() {
  return <View style={styles.placeholder} />;
}

interface AppNavigatorProps {
  initialReaderPageId?: string | null;
}

export default function AppNavigator({ initialReaderPageId }: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialReaderPageId ? 'Reader' : 'Main'}>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Camera" component={CameraScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="Reader"
          component={ReaderScreen}
          initialParams={initialReaderPageId ? { pageId: initialReaderPageId } : undefined}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LearningGuide"
          component={LearningGuideScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Vocabulary"
          component={VocabularyScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="StudyBook" component={StudyBookScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="BookDetail"
          component={BookDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BookTags"
          component={BookTagManagementScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BookLists"
          component={BookListOverviewScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BookListDetail"
          component={BookListDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BookListBulkAdd"
          component={BookListBulkAddScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: 6,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#ECEEF1',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  tabIconActive: {
    color: '#007AFF',
  },
  tabIconInactive: {
    color: '#8A8F99',
  },
  cameraButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    top: -18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  cameraButtonPlus: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '300',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
});
