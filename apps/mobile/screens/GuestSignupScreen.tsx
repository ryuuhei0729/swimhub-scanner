import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Linking, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Feather } from '@expo/vector-icons'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import { useAppleAuth } from '@/hooks/useAppleAuth'
import { AppleLoginButton } from '@/components/auth/AppleLoginButton'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import type { MainStackParamList } from '@/navigation/types'

export const GuestSignupScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const { signInWithGoogle, loading: googleLoading, error: googleError, clearError: clearGoogleError } = useGoogleAuth()
  const { signInWithApple, loading: appleLoading, error: appleError, clearError: clearAppleError, isAvailable: isAppleAvailable } = useAppleAuth()
  const [error] = useState<string | null>(null)

  const isLoading = googleLoading || appleLoading

  const handleAppleSignup = async () => {
    if (appleLoading) return
    clearAppleError()
    await signInWithApple()
  }

  const handleGoogleSignup = async () => {
    if (googleLoading) return
    clearGoogleError()
    await signInWithGoogle()
  }

  const displayError = error || googleError || appleError

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Image
            source={require('@/assets/icon.png')}
            style={styles.appIcon}
          />
          <Text style={styles.title}>アカウント登録</Text>
          <Text style={styles.subtitle}>
            登録するとトークンを購入して{'\n'}もっと多くの記録表を解析できます
          </Text>
        </View>

        {displayError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          {isAppleAvailable && (
            <AppleLoginButton
              onPress={handleAppleSignup}
              loading={appleLoading}
              disabled={isLoading}
              label="Appleで登録"
            />
          )}

          <GoogleLoginButton
            onPress={handleGoogleSignup}
            loading={googleLoading}
            disabled={isLoading}
            label="Googleで登録"
          />
        </View>
      </View>

      <View style={styles.legalContainer}>
        <Text style={styles.legalText}>
          続行することで、
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL('https://scanner.swim-hub.app/terms')}
          >
            利用規約
          </Text>
          と
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL('https://scanner.swim-hub.app/privacy')}
          >
            プライバシーポリシー
          </Text>
          に同意したものとみなされます。
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appIcon: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
  },
  buttonGroup: {
    gap: 12,
  },
  legalContainer: {
    paddingHorizontal: 32,
    paddingBottom: 16,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: '#2563EB',
    fontWeight: '500',
  },
})
