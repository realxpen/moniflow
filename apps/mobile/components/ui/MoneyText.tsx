import { StyleSheet, Text, type TextProps } from "react-native";

import { colors, typography } from "@/theme";

type MoneyTextProps = TextProps & {
  amount: number;
  currency?: "NGN";
};

const formatter = new Intl.NumberFormat("en-NG", {
  currency: "NGN",
  maximumFractionDigits: 0,
  style: "currency"
});

export function MoneyText({ amount, currency = "NGN", style, ...props }: MoneyTextProps) {
  const value = currency === "NGN" ? formatter.format(amount) : String(amount);

  return (
    <Text style={[styles.money, style]} {...props}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  money: {
    ...typography.display,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"]
  }
});
