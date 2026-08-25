import { useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { colors } from "@/theme";
import { formatTime, type TimeValue } from "@/utils/datetime";

import { ClockGlyph } from "./Glyph";
import { PickerField } from "./PickerField";
import { Sheet } from "./Sheet";
import { TimeWheel } from "./TimeWheel";

export type TimeFieldProps = {
  label: string;
  value: TimeValue;
  onChange: (time: TimeValue) => void;
  caption?: string;
  required?: boolean;
  hint?: string;
  tone?: "primary" | "accent";
  style?: StyleProp<ViewStyle>;
};

/** Time input + wheel sheet. The sheet edits a draft, committed on confirm. */
export function TimeField({
  label,
  value,
  onChange,
  caption,
  required,
  hint,
  tone = "primary",
  style,
}: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <>
      <PickerField
        label={label}
        required={required}
        hint={hint}
        tone={tone}
        style={style}
        value={formatTime(value)}
        caption={caption}
        icon={
          <ClockGlyph
            color={tone === "accent" ? colors.accent : colors.primary[600]}
          />
        }
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
      />
      <Sheet
        visible={open}
        title="Pick a time"
        footerHint={formatTime(draft)}
        confirmLabel="Set time"
        onClose={() => setOpen(false)}
        onConfirm={() => {
          onChange(draft);
          setOpen(false);
        }}
      >
        <TimeWheel value={draft} onChange={setDraft} tone={tone} />
      </Sheet>
    </>
  );
}
