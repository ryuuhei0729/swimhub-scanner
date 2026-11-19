import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import {
  isPrivacyOptionsRequired,
  showPrivacyOptionsForm,
  subscribeAdsSdkPrepared,
} from "@/lib/ads/ads-sdk";
import { colors, fontSize } from "@/theme";

interface Props {
  style?: StyleProp<TextStyle>;
  /** リンクを包む View のスタイル（表示不要な場合は View ごと描画しない） */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * 広告のプライバシー設定（UMP の同意変更フォーム）への導線。
 * EEA / 英国などで同意を取得したユーザーには、いつでも同意を変更できる入口を
 * 用意することが Google の EU ユーザー同意ポリシーで必須となっている。
 * 必要な地域のユーザーにだけ表示し、それ以外（日本など）では何も描画しない。
 */
export function AdPrivacyOptionsLink({ style, containerStyle }: Props) {
  const { t } = useTranslation();
  const [required, setRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      isPrivacyOptionsRequired().then((value) => {
        if (!cancelled) setRequired(value);
      });
    };
    // 前回までに得た同意状態で即時判定し、初回起動時はスキャナー画面の同意取得
    // (prepareAdsSdk) が終わった時点で再判定する。このリンク自身は同意フォームを
    // 起動しない（アカウント画面などで突然フォームが出るのを防ぐ）。
    check();
    const unsubscribe = subscribeAdsSdkPrepared(check);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handlePress = useCallback(() => {
    showPrivacyOptionsForm().catch((err) => {
      console.warn("広告のプライバシー設定フォームの表示に失敗:", err);
    });
  }, []);

  if (!required) return null;

  return (
    <View style={containerStyle}>
      <Text style={[styles.link, style]} onPress={handlePress} accessibilityRole="link">
        {t("common.adPrivacyOptions")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "500",
  },
});
