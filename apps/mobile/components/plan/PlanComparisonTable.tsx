import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, fontSize } from "@/theme";

export type PlanComparisonTableProps = {
  currentPlan: "guest" | "free" | "premium";
};

type ColumnKey = "guest" | "free" | "premium";
type CellValue = string | boolean;

interface FeatureRow {
  labelKey: string;
  guest: CellValue;
  free: CellValue;
  premium: CellValue;
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    labelKey: "planComparison.featureScanCount",
    guest: "planComparison.scanCountGuest",
    free: "planComparison.scanCountFree",
    premium: "planComparison.scanCountPremium",
  },
  {
    labelKey: "planComparison.featureSwimmerCount",
    guest: "planComparison.swimmerCountGuest",
    free: "planComparison.swimmerCountFree",
    premium: "planComparison.swimmerCountPremium",
  },
  {
    labelKey: "planComparison.featureHistory",
    guest: false,
    free: true,
    premium: true,
  },
  {
    labelKey: "planComparison.featureAds",
    guest: true,
    free: true,
    premium: false,
  },
];

const COLUMNS: ColumnKey[] = ["guest", "free", "premium"];

function CellContent({ value }: { value: CellValue }) {
  const { t } = useTranslation();

  if (typeof value === "boolean") {
    if (value) {
      return <Feather name="check" size={16} color={colors.green} />;
    }
    return <Feather name="x" size={16} color={colors.mutedLight} />;
  }

  return (
    <Text style={styles.cellText}>
      {t(value as Parameters<typeof t>[0])}
    </Text>
  );
}

export function PlanComparisonTable({ currentPlan }: PlanComparisonTableProps) {
  const { t } = useTranslation();

  const columnLabels: Record<ColumnKey, string> = {
    guest: t("planComparison.columnGuest"),
    free: t("planComparison.columnFree"),
    premium: t("planComparison.columnPremium"),
  };

  return (
    <View style={styles.table}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.featureCell} />
        {COLUMNS.map((col) => (
          <View
            key={col}
            style={[
              styles.headerCell,
              currentPlan === col && styles.headerCellHighlighted,
            ]}
          >
            <Text
              style={[
                styles.headerText,
                currentPlan === col && styles.headerTextHighlighted,
              ]}
            >
              {columnLabels[col]}
            </Text>
            {currentPlan === col && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>
                  {t("planComparison.current")}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Feature rows */}
      {FEATURE_ROWS.map((row, index) => (
        <View
          key={row.labelKey}
          style={[styles.row, index % 2 === 1 && styles.rowAlternate]}
        >
          <View style={styles.featureCell}>
            <Text style={styles.featureLabel}>
              {t(row.labelKey as Parameters<typeof t>[0])}
            </Text>
          </View>
          {COLUMNS.map((col) => (
            <View
              key={col}
              style={[
                styles.dataCell,
                currentPlan === col && styles.dataCellHighlighted,
              ]}
            >
              <CellContent value={row[col]} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureCell: {
    flex: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  headerCell: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  headerCellHighlighted: {
    backgroundColor: colors.primary,
  },
  headerText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "center",
  },
  headerTextHighlighted: {
    color: colors.white,
  },
  currentBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: radius.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  currentBadgeText: {
    fontSize: fontSize.xxs,
    color: colors.white,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowAlternate: {
    backgroundColor: colors.background,
  },
  featureLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  dataCell: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  dataCellHighlighted: {
    backgroundColor: colors.primaryMuted,
  },
  cellText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
});
