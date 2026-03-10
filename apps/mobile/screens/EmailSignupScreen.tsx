import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthProvider'

export const EmailSignupScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { signUp } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError(t('auth.errors.invalidCredentials'))
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(t('auth.errors.invalidCredentials'))
      return false
    }
    if (!password) {
      setError(t('auth.errors.invalidCredentials'))
      return false
    }
    if (password.length < 6) {
      setError(t('auth.errors.weakPassword'))
      return false
    }
    return true
  }

  const formatAuthError = (err: unknown): string => {
    const errorObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : {}
    const msg = typeof errorObj.message === 'string' ? errorObj.message.toLowerCase() : ''

    if (msg.includes('user already registered')) {
      return t('auth.errors.alreadyRegistered')
    }
    if (msg.includes('too many requests') || msg.includes('rate limit')) {
      return t('auth.errors.rateLimit')
    }
    if (msg.includes('network') || msg.includes('connection')) {
      return t('auth.errors.network')
    }
    return t('auth.errors.loginFailed')
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const { error: authError } = await signUp(email, password)
      if (authError) {
        setError(formatAuthError(authError))
      } else {
        Alert.alert(
          t('auth.confirmationSent'),
          t('auth.confirmationSentDetail'),
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        )
      }
    } catch {
      setError(t('auth.errors.unknown'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>{t('auth.createAccount')}</Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.email')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.password')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="newPassword"
                  editable={!loading}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                  pressed && !loading && styles.submitButtonPressed,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('auth.createAccount')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  titleSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
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
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonPressed: {
    backgroundColor: '#1D4ED8',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})
