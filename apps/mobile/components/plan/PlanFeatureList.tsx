import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, fontSize } from "@/theme";

export type PlanFeatureListProps = {
  currentPlan: "guest" | "free" | "premium";
};

interface FeatureItem {
  labelKey: string;
  availableFor: ("guest" | "free" | "premium")[];
  unlockConditionKey?: string;
}

const FEATURES: FeatureItem[] = [
  {
    labelKey: "planFeature.unlimitedScans",
    availableFor: ["premium"],
    unlockConditionKey: "planFeature.unlockWithPremium",
  },
  {
    labelKey: "planFeature.scanHistory",
    availableFor: ["free", "premium"],
    unlockConditionKey: "planFeature.unlockWithAccount",
  },
  {
    labelKey: "planFeature.unlimitedSwimmers",
    availableFor: ["free", "premium"],
    unlockConditionKey: "planFeature.unlockWithAccount",
  },
  {
    labelKey: "planFeature.noAds",
    availableFor: ["premium"],
    unlockConditionKey: "planFeature.unlockWithPremium",
  },
];

export function PlanFeatureList({ currentPlan }: PlanFeatureListProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        {t("planFeature.title")}
      </Text>
      <View style={styles.list}>
        {FEATURES.map((feature) => {
          const available = feature.availableFor.includes(currentPlan);
          return (
            <View key={feature.labelKey} style={styles.row}>
              <View style={styles.iconWrapper}>
                {available ? (
                  <Feather name="check-circle" size={18} color={colors.green} />
                ) : (
                  <Feather name="x" size={18} color={colors.mutedLight} />
                )}
              </View>
              <View style={styles.textGroup}>
                <Text
                  style={[
                    styles.featureLabel,
                    !available && styles.featureLabelMuted,
                  ]}
                >
                  {t(feature.labelKey as Parameters<typeof t>[0])}
                </Text>
                {!available && feature.unlockConditionKey && (
                  <Text style={styles.unlockCondition}>
                    {t(feature.unlockConditionKey as Parameters<typeof t>[0])}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  iconWrapper: {
    marginTop: 1,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  featureLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  featureLabelMuted: {
    color: colors.mutedLight,
  },
  unlockCondition: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
});
