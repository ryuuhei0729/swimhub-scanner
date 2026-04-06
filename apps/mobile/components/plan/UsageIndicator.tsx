import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, fontSize } from "@/theme";

export type UsageIndicatorProps = {
  plan: "guest" | "free" | "premium";
  remaining: number | null; // null = unlimited (premium)
  dailyLimit: number | null; // null = unlimited
  onUpsellPress: () => void;
};

export function UsageIndicator({
  plan,
  remaining,
  dailyLimit,
  onUpsellPress,
}: UsageIndicatorProps) {
  const { t } = useTranslation();

  if (plan === "premium") {
    return (
      <View style={styles.premiumContainer}>
        <Feather name="zap" size={14} color={colors.warningIcon} />
        <Text style={styles.premiumText}>
          {t("usageIndicator.unlimited")}
        </Text>
      </View>
    );
  }

  const used =
    dailyLimit !== null && remaining !== null
      ? Math.max(0, dailyLimit - remaining)
      : 0;
  const limit = dailyLimit ?? 1;
  const progress = limit > 0 ? Math.min(1, used / limit) : 0;
  const isExhausted = remaining !== null && remaining <= 0;

  const upsellLabel =
    plan === "guest"
      ? t("usageIndicator.guestUpsell")
      : t("usageIndicator.freeUpsell");

  return (
    <View style={styles.container}>
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {t("usageIndicator.usedOf", { used, limit })}
        </Text>
        {isExhausted && (
          <View style={styles.exhaustedBadge}>
            <Text style={styles.exhaustedBadgeText}>
              {t("usageIndicator.limitReached")}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(progress * 100)}%` as `${number}%` },
            isExhausted && styles.progressFillExhausted,
          ]}
        />
      </View>

      <TouchableOpacity style={styles.upsellButton} onPress={onUpsellPress}>
        <Text style={styles.upsellText}>{upsellLabel}</Text>
        <Feather name="arrow-right" size={12} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: spacing.xs,
  },
  premiumContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  premiumText: {
    fontSize: fontSize.sm,
    fontWeight: "bold",
    color: colors.amber,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    fontWeight: "500",
  },
  exhaustedBadge: {
    backgroundColor: colors.warningBackground,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  exhaustedBadgeText: {
    fontSize: fontSize.xs,
    color: colors.warningText,
    fontWeight: "600",
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  progressFillExhausted: {
    backgroundColor: colors.warningIcon,
  },
  upsellButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  upsellText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "600",
  },
});
