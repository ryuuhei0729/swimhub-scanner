import React, { useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { captureRef } from 'react-native-view-shot'
import XLSX from 'xlsx'
import { useTranslation } from 'react-i18next'
import { useScanResultStore } from '@/stores/scanResultStore'
import {
  formatTime,
  averageTime,
  fastestTime,
  slowestTime,
} from '@swimhub-scanner/shared'

const getDateString = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

const ROW_HEIGHT = 32
const NAME_WIDTH = 72
const STYLE_WIDTH = 36
const TIME_WIDTH = 40
const STAT_WIDTH = 44

export const ExportSheet: React.FC = () => {
  const { t } = useTranslation()
  const { menu, swimmers } = useScanResultStore()
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<View>(null)

  if (!menu || swimmers.length === 0) return null

  const maxTimes = Math.max(...swimmers.map((s) => s.times.length))
  const repCount = menu.repCount ?? maxTimes
  const setCount = menu.setCount ?? 1

  const buildRows = () => {
    const headers = [
      t('result.no'), t('result.name'), t('result.style'),
      ...Array.from({ length: maxTimes }, (_, i) => t('result.repHeader', { n: i + 1 })),
      t('result.average'), t('result.fastest'), t('result.slowest'),
    ]

    const rows = swimmers.map((s) => {
      const validTimes = s.times.filter((t): t is number => t !== null)
      const avg = averageTime(validTimes)
      const fast = fastestTime(validTimes)
      const slow = slowestTime(validTimes)

      return [
        s.no.toString(),
        s.name,
        s.style,
        ...s.times.map((t) => (t !== null ? formatTime(t) : '')),
        avg !== null ? formatTime(avg) : '',
        fast !== null ? formatTime(fast) : '',
        slow !== null ? formatTime(slow) : '',
      ]
    })

    return { headers, rows }
  }

  const exportCSV = async () => {
    setExporting(true)
    try {
      const { headers, rows } = buildRows()
      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
      ].join('\n')

      const fileName = `${t('result.timeRecordFile')}_${getDateString()}.csv`
      const fileUri = FileSystem.documentDirectory + fileName
      await FileSystem.writeAsStringAsync(fileUri, '\uFEFF' + csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      })

      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' })
    } catch (err) {
      Alert.alert(t('auth.errors.generic'), t('export.csv'))
      console.error('CSV export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const exportImage = async () => {
    if (!exportRef.current) return
    setExporting(true)
    try {
      const uri = await captureRef(exportRef, {
        format: 'png',
        quality: 1,
      })
      await Sharing.shareAsync(uri, { mimeType: 'image/png' })
    } catch (err) {
      Alert.alert(t('auth.errors.generic'), t('export.image'))
      console.error('Image export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const { headers, rows } = buildRows()

      const wb = XLSX.utils.book_new()

      // メニュー情報シート
      const menuData = [
        [t('result.menu')],
        [menu.description],
        [t('result.distance'), `${menu.distance}m`],
        [t('result.repCount'), `${menu.repCount}`],
        [t('result.setCount'), `${menu.setCount}`],
        [t('result.circle'), menu.circle ? `${menu.circle}秒` : '—'],
      ]
      const menuWs = XLSX.utils.aoa_to_sheet(menuData)
      XLSX.utils.book_append_sheet(wb, menuWs, t('result.menu'))

      // タイム記録シート
      const timeData = [headers, ...rows]
      const timeWs = XLSX.utils.aoa_to_sheet(timeData)
      XLSX.utils.book_append_sheet(wb, timeWs, t('result.timeRecordFile'))

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
      const fileName = `${t('result.timeRecordFile')}_${getDateString()}.xlsx`
      const fileUri = FileSystem.documentDirectory + fileName
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      })

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    } catch (err) {
      Alert.alert(t('auth.errors.generic'), t('export.excel'))
      console.error('Excel export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const circleLabel = menu.circle
    ? menu.circle >= 60
      ? `${Math.floor(menu.circle / 60)}分${menu.circle % 60 > 0 ? `${menu.circle % 60}秒` : ''}`
      : `${menu.circle}秒`
    : null

  return (
    <View style={styles.container}>
      {/* Offscreen export view */}
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={exportRef} collapsable={false} style={styles.exportRoot}>
          {/* Menu info */}
          <Text style={styles.exportMenuTitle}>{menu.description}</Text>
          <View style={styles.exportMenuRow}>
            <Text style={styles.exportMenuTag}>{menu.distance}m</Text>
            <Text style={styles.exportMenuTag}>{menu.repCount}{t('result.repHeader', { n: '' }).replace('', '').includes('本') ? '本' : ''}</Text>
            <Text style={styles.exportMenuTag}>{menu.setCount}{t('result.setHeader', { n: '' }).replace('', '').includes('セット') ? 'セット' : ''}</Text>
            {circleLabel && <Text style={styles.exportMenuTag}>{circleLabel}</Text>}
          </View>

          {/* Static table */}
          <View style={styles.exportTable}>
            {/* Set header */}
            {setCount > 1 && (
              <View style={styles.exportRow}>
                <View style={{ width: NAME_WIDTH + STYLE_WIDTH }} />
                {Array.from({ length: setCount }, (_, s) => (
                  <View key={s} style={[{ width: repCount * TIME_WIDTH, alignItems: 'center' }, s > 0 && styles.exportSetBorder]}>
                    <Text style={styles.exportSetText}>{t('result.setHeader', { n: s + 1 })}</Text>
                  </View>
                ))}
                <View style={{ width: STAT_WIDTH * 3 }} />
              </View>
            )}
            {/* Column headers */}
            <View style={[styles.exportRow, styles.exportHeaderRow]}>
              <View style={{ width: NAME_WIDTH, alignItems: 'center' }}>
                <Text style={styles.exportHeaderText}>{t('result.name')}</Text>
              </View>
              <View style={{ width: STYLE_WIDTH, alignItems: 'center' }}>
                <Text style={styles.exportHeaderText}>{t('result.style')}</Text>
              </View>
              {Array.from({ length: maxTimes }, (_, i) => {
                const isSetStart = i > 0 && i % repCount === 0
                return (
                  <View key={i} style={[{ width: TIME_WIDTH, alignItems: 'center' }, isSetStart && styles.exportSetBorder]}>
                    <Text style={styles.exportHeaderText}>{t('result.repHeader', { n: (i % repCount) + 1 })}</Text>
                  </View>
                )
              })}
              <View style={{ width: STAT_WIDTH, alignItems: 'center' }}>
                <Text style={styles.exportHeaderText}>{t('result.average')}</Text>
              </View>
              <View style={{ width: STAT_WIDTH, alignItems: 'center' }}>
                <Text style={styles.exportHeaderText}>{t('result.fastest')}</Text>
              </View>
              <View style={{ width: STAT_WIDTH, alignItems: 'center' }}>
                <Text style={styles.exportHeaderText}>{t('result.slowest')}</Text>
              </View>
            </View>

            {/* Data rows */}
            {swimmers.map((swimmer) => {
              const validTimes = swimmer.times.filter((t): t is number => t !== null)
              const fast = fastestTime(validTimes)
              const slow = slowestTime(validTimes)
              const avg = averageTime(validTimes)

              return (
                <View key={swimmer.no} style={[styles.exportRow, styles.exportDataRow]}>
                  <View style={{ width: NAME_WIDTH, paddingHorizontal: 4 }}>
                    <Text style={styles.exportCellText} numberOfLines={1}>{swimmer.name || '—'}</Text>
                  </View>
                  <View style={{ width: STYLE_WIDTH, alignItems: 'center' }}>
                    <Text style={styles.exportStyleText}>{swimmer.style}</Text>
                  </View>
                  {swimmer.times.map((time, i) => {
                    const isFastest = time !== null && time === fast
                    const isSlowest = time !== null && time === slow
                    const isSetStart = i > 0 && i % repCount === 0
                    return (
                      <View key={i} style={[{ width: TIME_WIDTH, alignItems: 'center' }, isSetStart && styles.exportSetBorder]}>
                        <Text style={[
                          styles.exportCellText,
                          isFastest && styles.exportFastest,
                          isSlowest && styles.exportSlowest,
                        ]}>
                          {time !== null ? formatTime(time) : '—'}
                        </Text>
                      </View>
                    )
                  })}
                  <View style={{ width: STAT_WIDTH, alignItems: 'center' }}>
                    <Text style={styles.exportCellText}>{avg !== null ? formatTime(avg) : '—'}</Text>
                  </View>
                  <View style={{ width: STAT_WIDTH, alignItems: 'center' }}>
                    <Text style={[styles.exportCellText, styles.exportFastest]}>{fast !== null ? formatTime(fast) : '—'}</Text>
                  </View>
                  <View style={{ width: STAT_WIDTH, alignItems: 'center' }}>
                    <Text style={[styles.exportCellText, styles.exportSlowest]}>{slow !== null ? formatTime(slow) : '—'}</Text>
                  </View>
                </View>
              )
            })}
          </View>

          <Text style={styles.exportWatermark}>SwimHub Scanner</Text>
        </View>
      </View>

      {/* Buttons */}
      <Text style={styles.title}>{t('scanner.result.output')}</Text>
      <TouchableOpacity
        style={[styles.button, styles.imageButton, { marginBottom: 8 }]}
        onPress={exportImage}
        disabled={exporting}
      >
        {exporting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>{t('export.image')}</Text>
        )}
      </TouchableOpacity>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.csvButton]}
          onPress={exportCSV}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>CSV</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.excelButton]}
          onPress={exportExcel}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Excel</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButton: {
    backgroundColor: '#7C3AED',
  },
  csvButton: {
    backgroundColor: '#059669',
  },
  excelButton: {
    backgroundColor: '#2563EB',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Offscreen export view
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
  },
  exportRoot: {
    backgroundColor: '#ffffff',
    padding: 16,
  },
  exportMenuTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  exportMenuRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  exportMenuTag: {
    fontSize: 11,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Export table
  exportTable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  exportRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    alignItems: 'center',
  },
  exportHeaderRow: {
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  exportDataRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  exportHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  exportCellText: {
    fontSize: 11,
    color: '#374151',
  },
  exportStyleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  exportFastest: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  exportSlowest: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  exportSetBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#D1D5DB',
  },
  exportSetText: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  exportWatermark: {
    fontSize: 9,
    color: '#D1D5DB',
    textAlign: 'right',
    marginTop: 6,
  },
})
