import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useScanResultStore } from "@/stores/scanResultStore";
import { formatTime, averageTime, fastestTime, slowestTime } from "@swimhub-scanner/shared";
import type { SwimStroke } from "@swimhub-scanner/shared";
import { colors, spacing, radius, fontSize } from "@/theme";

const STROKES: SwimStroke[] = ["Fr", "Br", "Ba", "Fly", "IM"];

interface EditingCell {
  swimmerNo: number;
  field: "name" | "time";
  timeIndex?: number;
}

export const ResultTable: React.FC = () => {
  const { t } = useTranslation();
  const STROKE_LABELS: Record<SwimStroke, string> = {
    Fr: t("strokes.Fr"),
    Br: t("strokes.Br"),
    Ba: t("strokes.Ba"),
    Fly: t("strokes.Fly"),
    IM: t("strokes.IM"),
  };
  const {
    menu,
    swimmers,
    updateSwimmerName,
    updateSwimmerStyle,
    updateTime,
    addSwimmer,
    removeSwimmer,
  } = useScanResultStore();

  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  if (swimmers.length === 0) return null;

  const maxTimes = Math.max(...swimmers.map((s) => s.times.length));
  const repCount = menu?.repCount ?? maxTimes;
  const setCount = menu?.setCount ?? 1;

  const handleStartEdit = (cell: EditingCell, currentValue: string) => {
    setEditingCell(cell);
    setEditValue(currentValue);
  };

  const handleEndEdit = () => {
    if (!editingCell) return;

    if (editingCell.field === "name") {
      updateSwimmerName(editingCell.swimmerNo, editValue);
    } else if (editingCell.field === "time" && editingCell.timeIndex !== undefined) {
      const parsed = parseFloat(editValue);
      updateTime(editingCell.swimmerNo, editingCell.timeIndex, isNaN(parsed) ? null : parsed);
    }

    setEditingCell(null);
    setEditValue("");
  };

  const showStylePicker = (swimmerNo: number, _currentStyle: SwimStroke) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t("common.cancel"), ...STROKES.map((s) => STROKE_LABELS[s])],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            updateSwimmerStyle(swimmerNo, STROKES[buttonIndex - 1]!);
          }
        },
      );
    } else {
      Alert.alert(t("result.selectStyle"), "", [
        ...STROKES.map((s) => ({
          text: STROKE_LABELS[s],
          onPress: () => updateSwimmerStyle(swimmerNo, s),
        })),
        { text: t("common.cancel"), style: "cancel" as const },
      ]);
    }
  };

  const handleRemoveSwimmer = (no: number, name: string) => {
    Alert.alert(t("result.deleteSwimmerTitle"), t("result.deleteSwimmerConfirm", { name: name || t("result.noName") }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => removeSwimmer(no) },
    ]);
  };

  const isEditing = (swimmerNo: number, field: string, timeIndex?: number) => {
    if (!editingCell) return false;
    return (
      editingCell.swimmerNo === swimmerNo &&
      editingCell.field === field &&
      editingCell.timeIndex === timeIndex
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("result.title")}</Text>

      <View style={styles.tableWrapper}>
        {/* Fixed left columns (名前) */}
        <View style={styles.fixedLeft}>
          {/* Set header spacer (match right side set header row) */}
          {setCount > 1 && <View style={styles.fixedHeaderCell} />}
          {/* Header */}
          <View style={styles.fixedHeaderCell}>
            <Text style={styles.headerText}>{t("result.name")}</Text>
          </View>

          {/* Data rows */}
          {swimmers.map((swimmer) => (
            <View key={swimmer.no} style={styles.fixedDataRow}>
              {isEditing(swimmer.no, "name") ? (
                <TextInput
                  style={styles.nameEditInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  onBlur={handleEndEdit}
                  onSubmitEditing={handleEndEdit}
                  autoFocus
                />
              ) : (
                <TouchableOpacity
                  style={styles.nameCell}
                  onPress={() =>
                    handleStartEdit({ swimmerNo: swimmer.no, field: "name" }, swimmer.name)
                  }
                >
                  <Text style={styles.nameCellText} numberOfLines={1}>
                    {swimmer.name || "—"}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleRemoveSwimmer(swimmer.no, swimmer.name)}
              >
                <Feather name="x" size={12} color={colors.mutedLight} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Scrollable right columns (種目 + タイム + 統計) */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.scrollArea}
        >
          <View>
            {/* Set header row */}
            {setCount > 1 && (
              <View style={styles.scrollHeaderRow}>
                <View style={styles.styleCol} />
                {Array.from({ length: setCount }, (_, s) => (
                  <View
                    key={s}
                    style={[
                      {
                        width: repCount * 36,
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                      },
                      s > 0 && styles.setBorder,
                    ]}
                  >
                    <Text style={styles.setHeaderText}>{s + 1}{t("result.set")}</Text>
                  </View>
                ))}
                <View style={styles.statCol} />
                <View style={styles.statCol} />
                <View style={styles.statCol} />
              </View>
            )}
            {/* Column header */}
            <View style={styles.scrollHeaderRow}>
              <View style={styles.styleCol}>
                <Text style={styles.headerText}>{t("result.style")}</Text>
              </View>
              {Array.from({ length: maxTimes }, (_, i) => {
                const isSetStart = i > 0 && i % repCount === 0;
                return (
                  <View key={i} style={[styles.timeCol, isSetStart && styles.setBorder]}>
                    <Text style={styles.headerText}>{(i % repCount) + 1}{t("result.repShort")}</Text>
                  </View>
                );
              })}
              <View style={[styles.statCol, styles.avgCol]}>
                <Text style={styles.headerText}>{t("result.average")}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.headerText}>{t("result.fastest")}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.headerText}>{t("result.slowest")}</Text>
              </View>
            </View>

            {/* Data rows */}
            {swimmers.map((swimmer) => {
              const validTimes = swimmer.times.filter((t): t is number => t !== null);
              const avg = averageTime(validTimes);
              const fast = fastestTime(validTimes);
              const slow = slowestTime(validTimes);

              return (
                <View key={swimmer.no} style={styles.scrollDataRow}>
                  {/* 種目 */}
                  <TouchableOpacity
                    style={styles.styleCol}
                    onPress={() => showStylePicker(swimmer.no, swimmer.style)}
                  >
                    <Text style={styles.styleText}>
                      {swimmer.style}
                      <Text style={styles.styleChevron}> ▼</Text>
                    </Text>
                  </TouchableOpacity>

                  {/* タイム */}
                  {swimmer.times.map((time, i) => {
                    const isFastest = time !== null && time === fast;
                    const isSlowest = time !== null && time === slow;
                    const isNull = time === null;
                    const isSetStart = i > 0 && i % repCount === 0;

                    if (isEditing(swimmer.no, "time", i)) {
                      return (
                        <TextInput
                          key={i}
                          style={[
                            styles.timeCol,
                            styles.timeEditInput,
                            isSetStart && styles.setBorder,
                          ]}
                          value={editValue}
                          onChangeText={setEditValue}
                          onBlur={handleEndEdit}
                          onSubmitEditing={handleEndEdit}
                          keyboardType="decimal-pad"
                          autoFocus
                        />
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.timeCol,
                          isNull && styles.nullCell,
                          isSetStart && styles.setBorder,
                        ]}
                        onPress={() =>
                          handleStartEdit(
                            { swimmerNo: swimmer.no, field: "time", timeIndex: i },
                            time !== null ? time.toString() : "",
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.cellText,
                            isFastest && styles.fastestText,
                            isSlowest && styles.slowestText,
                            isNull && styles.nullText,
                          ]}
                        >
                          {time !== null ? formatTime(time) : "—"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* 統計 */}
                  <View style={[styles.statCol, styles.avgCol]}>
                    <Text style={[styles.cellText, styles.avgText]}>{avg !== null ? formatTime(avg) : "—"}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={[styles.cellText, styles.fastestText]}>
                      {fast !== null ? formatTime(fast) : "—"}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={[styles.cellText, styles.slowestText]}>
                      {slow !== null ? formatTime(slow) : "—"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Add swimmer */}
      <TouchableOpacity style={styles.addButton} onPress={addSwimmer}>
        <Text style={styles.addButtonText}>{t("result.addSwimmer")}</Text>
      </TouchableOpacity>
    </View>
  );
};

const ROW_HEIGHT = 40;
const FIXED_WIDTH = 80;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  tableWrapper: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  // Fixed left
  fixedLeft: {
    width: FIXED_WIDTH,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    zIndex: 1,
  },
  fixedHeaderCell: {
    height: ROW_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fixedDataRow: {
    flexDirection: "row",
    height: ROW_HEIGHT,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameCell: {
    flex: 1,
    height: ROW_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  nameCellText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  nameEditInput: {
    flex: 1,
    height: ROW_HEIGHT - 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.xs,
    fontSize: 13,
    paddingHorizontal: 6,
    marginHorizontal: 2,
  },
  deleteButton: {
    width: 20,
    height: ROW_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },

  // Scrollable right
  scrollArea: {
    flex: 1,
  },
  scrollHeaderRow: {
    flexDirection: "row",
    height: ROW_HEIGHT,
    backgroundColor: colors.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  scrollDataRow: {
    flexDirection: "row",
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  headerText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.muted,
    textAlign: "center",
  },
  cellText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },

  // Column widths
  styleCol: {
    width: 48,
    justifyContent: "center",
    alignItems: "center",
    height: ROW_HEIGHT,
  },
  styleText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  styleChevron: {
    fontSize: 8,
    color: colors.mutedLight,
  },
  timeCol: {
    width: 36,
    justifyContent: "center",
    alignItems: "center",
    height: ROW_HEIGHT,
  },
  statCol: {
    width: 60,
    justifyContent: "center",
    alignItems: "center",
    height: ROW_HEIGHT,
  },
  timeEditInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.xs,
    fontSize: 13,
    textAlign: "center",
    padding: spacing.xs,
    marginHorizontal: 2,
  },

  // Average column highlight
  avgCol: {
    backgroundColor: colors.warningLight,
  },
  avgText: {
    fontWeight: "bold",
    color: colors.amber,
  },

  // Highlights
  nullCell: {
    backgroundColor: colors.warningMuted,
  },
  nullText: {
    color: colors.amber,
  },
  fastestText: {
    color: colors.primary,
    fontWeight: "bold",
  },
  slowestText: {
    color: colors.destructive,
    fontWeight: "bold",
  },

  // Set separators
  setBorder: {
    borderLeftWidth: 2,
    borderLeftColor: colors.mutedLight,
  },
  setHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.mutedLight,
    textAlign: "center",
  },

  // Add button
  addButton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: 10,
    alignItems: "center",
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: "dashed",
  },
  addButtonText: {
    color: colors.muted,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
});
