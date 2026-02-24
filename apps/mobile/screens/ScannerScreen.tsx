import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { getUserStatus, scanTimesheet, ApiError } from '@/lib/api-client'
import { useScanResultStore } from '@/stores/scanResultStore'
import { validateImageMimeType, validateImageSize, estimateBase64Size } from '@swimhub-scanner/shared'
import type { UserStatusResponse } from '@swimhub-scanner/shared'
import { ResultTable } from '@/components/scanner/ResultTable'
import { ExportSheet } from '@/components/scanner/ExportSheet'

type Step = 'idle' | 'scanning' | 'result'

export const ScannerScreen: React.FC = () => {
  const [step, setStep] = useState<Step>('idle')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg')
  const [userStatus, setUserStatus] = useState<UserStatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const { menu, swimmers, setResult, reset: resetResult } = useScanResultStore()

  const fetchUserStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const status = await getUserStatus()
      setUserStatus(status)
    } catch (err) {
      console.error('ユーザーステータスの取得に失敗:', err)
    } finally {
      setStatusLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchUserStatus()
    setRefreshing(false)
  }, [fetchUserStatus])

  useEffect(() => {
    fetchUserStatus()
  }, [fetchUserStatus])

  const pickImage = async (useCamera: boolean) => {
    setError(null)

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    }

    let result: ImagePicker.ImagePickerResult

    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('権限エラー', 'カメラへのアクセスが許可されていません')
        return
      }
      result = await ImagePicker.launchCameraAsync(options)
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options)
    }

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    const mimeType = asset.mimeType || 'image/jpeg'

    // バリデーション
    if (!validateImageMimeType(mimeType)) {
      setError('JPEG または PNG 形式の画像を使用してください')
      return
    }

    if (asset.base64) {
      const size = estimateBase64Size(asset.base64)
      if (!validateImageSize(size)) {
        setError('画像サイズは10MB以下にしてください')
        return
      }
    }

    setImageUri(asset.uri)
    setImageBase64(asset.base64 || null)
    setImageMimeType(mimeType)
  }

  const startScan = async () => {
    if (!imageBase64) return

    setStep('scanning')
    setError(null)

    try {
      const response = await scanTimesheet({
        image: imageBase64,
        mimeType: imageMimeType as 'image/jpeg' | 'image/png',
      })
      setResult(response)
      setStep('result')
      // 利用状況を再取得
      fetchUserStatus()
    } catch (err) {
      setStep('idle')
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'DAILY_LIMIT_EXCEEDED':
            setError('本日の利用回数上限に達しました')
            break
          case 'SWIMMER_LIMIT_EXCEEDED':
            setError('無料プランでは8名まで解析可能です')
            break
          case 'PARSE_ERROR':
            setError('画像からタイム情報を読み取れませんでした。鮮明なタイム記録表の画像を使用してください')
            break
          case 'API_ERROR':
            setError('画像の解析に失敗しました。タイム記録表の画像であることを確認し、再度お試しください')
            break
          case 'IMAGE_ERROR':
            setError(err.message)
            break
          default:
            setError('解析中にエラーが発生しました。再度お試しください')
        }
      } else {
        const isNetworkError = err instanceof TypeError && err.message?.includes('Network')
        setError(
          isNetworkError
            ? '通信エラーが発生しました。ネットワーク接続を確認してください'
            : '解析に失敗しました。再度お試しください'
        )
      }
    }
  }

  const handleReset = () => {
    setStep('idle')
    setImageUri(null)
    setImageBase64(null)
    setError(null)
    resetResult()
  }

  const showImagePickerOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['キャンセル', '写真を撮る', 'ライブラリから選ぶ'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true)
          else if (buttonIndex === 2) pickImage(false)
        },
      )
    } else {
      Alert.alert('画像を選択', '', [
        { text: '写真を撮る', onPress: () => pickImage(true) },
        { text: 'ライブラリから選ぶ', onPress: () => pickImage(false) },
        { text: 'キャンセル', style: 'cancel' },
      ])
    }
  }

  const canScan = userStatus && (
    userStatus.dailyLimit === null ||
    userStatus.todayScanCount < userStatus.dailyLimit
  )

  const remainingScans = userStatus?.dailyLimit !== null && userStatus?.dailyLimit !== undefined
    ? userStatus.dailyLimit - userStatus.todayScanCount
    : null

  // Step 2: 解析中
  if (step === 'scanning') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scanningContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.scanningText}>画像を解析しています...</Text>
          <Text style={styles.scanningSubtext}>しばらくお待ちください</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Step 3: 結果確認
  if (step === 'result' && menu && swimmers.length > 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.resultContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>メニュー情報</Text>
            <Text style={styles.menuDescription}>{menu.description}</Text>
            <View style={styles.menuDetails}>
              <Text style={styles.menuDetail}>距離: {menu.distance}m</Text>
              <Text style={styles.menuDetail}>本数: {menu.repCount}本</Text>
              <Text style={styles.menuDetail}>セット: {menu.setCount}セット</Text>
              {menu.circle && (
                <Text style={styles.menuDetail}>
                  サークル: {menu.circle >= 60
                    ? `${Math.floor(menu.circle / 60)}分${menu.circle % 60 > 0 ? `${menu.circle % 60}秒` : ''}`
                    : `${menu.circle}秒`}
                </Text>
              )}
            </View>
          </View>

          <ResultTable />

          <ExportSheet />

          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>新しい画像を解析する</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Step 1: 画像選択
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.idleContainer}
        contentContainerStyle={styles.idleContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 利用状況 */}
        {!statusLoading && userStatus && (
          <View style={styles.statusBar}>
            {remainingScans !== null ? (
              <Text style={styles.statusText}>
                残り利用回数: {remainingScans} / {userStatus.dailyLimit}
                {' '}(0:00にリセット)
              </Text>
            ) : (
              <Text style={styles.statusText}>
                Premium — 回数無制限
              </Text>
            )}
          </View>
        )}

        {/* エラー表示 */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 画像選択エリア */}
        <View style={styles.imagePickerSection}>
          {imageUri ? (
            <TouchableOpacity
              style={styles.previewContainer}
              onPress={showImagePickerOptions}
              activeOpacity={0.8}
            >
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => { setImageUri(null); setImageBase64(null) }}
              >
                <Feather name="x" size={16} color="#ffffff" />
              </TouchableOpacity>
              <View style={styles.changeImageHint}>
                <Feather name="refresh-cw" size={14} color="#ffffff" />
                <Text style={styles.changeImageHintText}>タップで変更</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.placeholderContainer}
              onPress={showImagePickerOptions}
              activeOpacity={0.7}
            >
              <Feather name="camera" size={48} color="#9CA3AF" />
              <Text style={styles.placeholderText}>タップして画像を選択</Text>
              <Text style={styles.placeholderSubtext}>写真を撮る / ライブラリから選ぶ</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 解析ボタン */}
        <TouchableOpacity
          style={[
            styles.scanButton,
            (!imageBase64 || !canScan) && styles.scanButtonDisabled,
          ]}
          onPress={startScan}
          disabled={!imageBase64 || !canScan}
        >
          <Text style={[
            styles.scanButtonText,
            (!imageBase64 || !canScan) && styles.scanButtonTextDisabled,
          ]}>
            解析する
          </Text>
        </TouchableOpacity>

        {!canScan && userStatus && (
          <View style={styles.limitWarning}>
            <Text style={styles.limitWarningText}>
              本日の利用回数上限に達しました。{'\n'}
              Premiumにアップグレードすると無制限でご利用いただけます。
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Step 1: Idle
  idleContainer: {
    flex: 1,
  },
  idleContent: {
    padding: 16,
  },
  statusBar: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  imagePickerSection: {
    marginBottom: 16,
  },
  previewContainer: {
    position: 'relative',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 240,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginTop: 8,
  },
  placeholderSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  changeImageHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  changeImageHintText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  scanButton: {
    backgroundColor: '#2563EB',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  scanButtonTextDisabled: {
    color: '#9CA3AF',
  },
  limitWarning: {
    marginTop: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
  },
  limitWarningText: {
    color: '#92400E',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Step 2: Scanning
  scanningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  scanningSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  // Step 3: Result
  resultContainer: {
    flex: 1,
    padding: 16,
  },
  menuInfo: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  menuDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuDetail: {
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#DBEAFE',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  resetButton: {
    backgroundColor: '#F3F4F6',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  resetButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
})
