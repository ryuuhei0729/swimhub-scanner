import React, { useEffect } from 'react'
import { enableScreens } from 'react-native-screens'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from './contexts/AuthProvider'
import { AuthStack } from './navigation/AuthStack'
import { MainStack } from './navigation/MainStack'
import { supabase } from './lib/supabase'

enableScreens()

/**
 * Supabase未初期化時のエラー画面
 */
const SupabaseErrorScreen: React.FC = () => {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>設定エラー</Text>
      <Text style={styles.errorMessage}>
        Supabaseの設定が正しく行われていません。
        {'\n\n'}
        アプリの設定を確認してください。
      </Text>
    </View>
  )
}

/**
 * 認証状態に応じてナビゲーションスタックを切り替え
 */
const AppNavigator: React.FC = () => {
  const { isAuthenticated, isGuest, loading } = useAuth()

  if (!supabase) {
    return <SupabaseErrorScreen />
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <NavigationContainer>
        {(isAuthenticated || isGuest) ? <MainStack /> : <AuthStack />}
        <StatusBar style="auto" />
      </NavigationContainer>
    </View>
  )
}

export default function App() {
  // Initialize Google Mobile Ads SDK
  useEffect(() => {
    try {
      const mobileAds = require('react-native-google-mobile-ads').default
      mobileAds().initialize()
    } catch {
      // Ad module not available (e.g., running in Expo Go)
    }
  }, [])

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
  },
})
