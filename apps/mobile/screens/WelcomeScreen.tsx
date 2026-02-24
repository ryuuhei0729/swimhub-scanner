import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Feather } from '@expo/vector-icons'
import type { AuthStackParamList } from '@/navigation/types'

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>()

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Feather name="camera" size={80} color="#1E3A8A" />
          <Text style={styles.appName}>SwimHub Scanner</Text>
          <Text style={styles.tagline}>
            手書きタイム記録表をAIで読み取り{'\n'}デジタル化するアプリ
          </Text>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => navigation.navigate('GetStarted')}
          accessibilityRole="button"
          accessibilityLabel="さっそく始める"
        >
          <Text style={styles.primaryButtonText}>さっそく始める</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
          onPress={() => navigation.navigate('LoginMethod')}
          accessibilityRole="button"
          accessibilityLabel="ログイン"
        >
          <Text style={styles.secondaryButtonText}>ログイン</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    gap: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  tagline: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: '#1D4ED8',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonPressed: {
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 17,
    fontWeight: '600',
  },
})
