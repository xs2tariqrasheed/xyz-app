import type { StyleProp, ViewStyle } from 'react-native';

import { Field } from './Field';
import { Input, type InputProps } from './Input';

export type TextFieldProps = Omit<InputProps, 'style' | 'invalid'> & {
  label: string;
  required?: boolean;
  hint?: string;
  /** Validation message. Reddens the control and replaces `hint`. */
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Single-line text input with its label. Focus is drawn with a brand border
 * plus a 3px `--focus-ring` halo, the same treatment as the theme page's
 * focused field.
 */
export function TextField({ label, required, hint, error, style, ...inputProps }: TextFieldProps) {
  return (
    <Field label={label} required={required} hint={hint} error={error} style={style}>
      <Input {...inputProps} invalid={!!error} accessibilityLabel={inputProps.accessibilityLabel ?? label} />
    </Field>
  );
}
