import { MailGlyph, PhoneGlyph } from '@/components/ui/Glyph';
import { colors } from '@/theme';
import { contactType, type ContactTypeId } from '@/utils/contacts';

export type ContactTypeGlyphProps = {
  type: ContactTypeId;
  color?: string;
  size?: number;
};

/** Handset for a phone-shaped contact, envelope for an email. */
export function ContactTypeGlyph({
  type,
  color = colors.primary[600],
  size = 16,
}: ContactTypeGlyphProps) {
  return contactType(type).kind === 'phone' ? (
    <PhoneGlyph color={color} size={size} />
  ) : (
    <MailGlyph color={color} size={size} />
  );
}
