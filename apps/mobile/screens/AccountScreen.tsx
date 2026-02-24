import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { useAuth } from '@/contexts/AuthProvider'
import { getUserStatus } from '@/lib/api-client'
import type { UserStatusResponse } from '@swimhub-scanner/shared'

export const AccountScreen: React.FC = () => {
  const { user, signOut } = useAuth()
  const [userStatus, setUserStatus] = useState<UserStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const status = await getUserStatus()
      setUserStatus(status)
    } catch (err) {
      console.error('ステータス取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleSignOut = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut()
            if (error) {
              Alert.alert('エラー', 'ログアウトに失敗しました')
            }
          },
        },
      ],
    )
  }

  const appVersion = Constants.expoConfig?.version || '1.0.0'

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* ユーザー情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アカウント情報</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>メールアドレス</Text>
              <Text style={styles.infoValue}>{user?.email || '—'}</Text>
            </View>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 12 }} color="#2563EB" />
            ) : userStatus && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>プラン</Text>
                  <View style={[
                    styles.badge,
                    userStatus.plan === 'premium' ? styles.premiumBadge : styles.freeBadge,
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      userStatus.plan === 'premium' ? styles.premiumBadgeText : styles.freeBadgeText,
                    ]}>
                      {userStatus.plan === 'premium' ? 'Premium' : 'Free'}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ログアウト */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>ログアウト</Text>
          </TouchableOpacity>
        </View>

        {/* アプリ情報 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SwimHub Scanner v{appVersion}</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  freeBadge: {
    backgroundColor: '#F3F4F6',
  },
  premiumBadge: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  freeBadgeText: {
    color: '#6B7280',
  },
  premiumBadgeText: {
    color: '#92400E',
  },
  signOutButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  signOutButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
})
