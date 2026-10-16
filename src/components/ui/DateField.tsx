import { useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { colors } from "@/theme";
import { formatDayDistance, formatFullDate } from "@/utils/datetime";

import { CalendarPicker, type QuickPick } from "./CalendarPicker";
import { CalendarGlyph } from "./Glyph";
import { PickerField } from "./PickerField";
import { Sheet } from "./Sheet";

export type DateFieldProps = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  today: Date;
  /** Earliest selectable day. Defaults to `today`. */
  minDate?: Date;
  quickPicks?: readonly QuickPick[];
  /** Sheet copy. Defaults to the reservation wording. */
  sheetTitle?: string;
  sheetSubtitle?: string;
  required?: boolean;
  hint?: string;
  /** Validation message; replaces the hint and reddens the control. */
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/** Date input + calendar sheet. The sheet edits a draft, committed on confirm. */
export function DateField({
  label,
  value,
  onChange,
  today,
  minDate,
  quickPicks,
  sheetTitle = "Pick a date",
  sheetSubtitle = "",
  required,
  hint,
  error,
  style,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <>
      <PickerField
        label={label}
        required={required}
        hint={hint}
        error={error}
        style={style}
        value={formatFullDate(value)}
        caption={formatDayDistance(value, today)}
        icon={<CalendarGlyph color={colors.primary[600]} />}
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
      />
      <Sheet
        visible={open}
        title={sheetTitle}
        subtitle={sheetSubtitle}
        footerHint={formatFullDate(draft)}
        confirmLabel="Set date"
        onClose={() => setOpen(false)}
        onConfirm={() => {
          onChange(draft);
          setOpen(false);
        }}
      >
        <CalendarPicker
          value={draft}
          onChange={setDraft}
          today={today}
          minDate={minDate}
          quickPicks={quickPicks}
        />
      </Sheet>
    </>
  );
}
