import { type RideDocument, rideDocumentHtml } from '@/services/rideDocument';

const FRAME_ID = 'ride-document-print';

/**
 * Prints a voucher or receipt from a hidden frame holding the same HTML the
 * native print sheet gets, so the page's header, menu and buttons stay off
 * the paper. `expo-print` on web can only print the whole page.
 */
export function printRideDocument(doc: RideDocument): Promise<void> {
  document.getElementById(FRAME_ID)?.remove();

  const frame = document.createElement('iframe');
  frame.id = FRAME_ID;
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';

  return new Promise<void>((resolve, reject) => {
    frame.onload = () => {
      const view = frame.contentWindow;
      if (!view) {
        frame.remove();
        reject(new Error('Print frame did not load.'));
        return;
      }
      view.addEventListener('afterprint', () => frame.remove(), { once: true });
      view.focus();
      view.print();
      resolve();
    };
    frame.srcdoc = rideDocumentHtml(doc);
    document.body.appendChild(frame);
  });
}
