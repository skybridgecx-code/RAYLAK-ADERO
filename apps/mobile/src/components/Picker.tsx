import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { borderRadius, colors, fontSize, spacing } from "@/lib/theme";

type PickerOption = {
  label: string;
  value: string;
};

type PickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: PickerOption[];
  placeholder?: string;
};

export function Picker({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
}: PickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    const selected = options.find((option) => option.value === value);
    return selected?.label ?? placeholder;
  }, [options, placeholder, value]);

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{label}</Text>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          backgroundColor: "rgba(255,255,255,0.03)",
        }}
      >
        <Text style={{ color: value ? colors.text : colors.textMuted, fontSize: fontSize.md }}>
          {selectedLabel}
        </Text>
      </Pressable>
      <Modal transparent animationType="fade" visible={isOpen} onRequestClose={() => setIsOpen(false)}>
        <Pressable
          onPress={() => setIsOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            justifyContent: "center",
            padding: spacing.lg,
          }}
        >
          <Pressable
            onPress={() => null}
            style={{
              maxHeight: "70%",
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: borderRadius.lg,
              overflow: "hidden",
            }}
          >
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setIsOpen(false);
                    }}
                    style={{
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.md,
                      backgroundColor: isSelected ? colors.primaryBg : colors.surface,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? colors.text : colors.textSecondary,
                        fontSize: fontSize.md,
                        fontWeight: isSelected ? "600" : "400",
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
