import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { Screen } from '@/components/layout/Screen';
import type { RideAction } from '@/components/rides/RideActionLink';
import { RideResults } from '@/components/rides/RideResults';
import { RideSearchForm, type RideSearchFormValue } from '@/components/rides/RideSearchForm';
import { Alert } from '@/components/ui/Alert';
import { WebsiteLinkList } from '@/components/website/WebsiteLinkList';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RECEIPTS_MESSAGES, WEBSITE_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useFetchData } from '@/hooks/useFetchData';
import { openRateRide } from '@/services/rateRide';
import {
  allOrdersJData,
  filterRides,
  HISTORY_DEFAULT_DAYS,
  HISTORY_REACH_DAYS,
  type Ride,
  receiptRides,
  toRides,
} from '@/services/rides';
import { addDays, startOfDay } from '@/utils/datetime';

type Notice = { tone: 'success' | 'danger'; message: string } | null;

/**
 * Receipts for completed rides (guide 23, missing-screens/13): the ride
 * history search (`RES.S.ALL_ORDERS`) narrowed to finished rides, each opening
 * its receipt (`RES.S.LOAD_RESERVATION`). Account invoices wait on a gateway
 * code (`PROF.S.INVOICES`).
 */
export default function ReceiptsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const loginId = session?.loginId ?? '';

  const [today] = useState(() => new Date());
  const [earliest] = useState(() => addDays(startOfDay(today), -HISTORY_REACH_DAYS));
  const [filters, setFilters] = useState<RideSearchFormValue>(() => ({
    from: addDays(startOfDay(today), -HISTORY_DEFAULT_DAYS),
    to: startOfDay(today),
    paymentMethod: 'all',
  }));
  // The search that ran — the list and its header only follow the form on Search.
  const [searched, setSearched] = useState(filters);
  const [notice, setNotice] = useState<Notice>(null);

  const { data, isLoading, isError, refetch } = useFetchData(
    ACTION_CODES.ALL_ORDERS,
    GATEWAY_VIEW_NAME,
    allOrdersJData(loginId, searched.from, searched.to),
  );
  const { rides, refused } = useMemo((): { rides: Ride[]; refused: boolean } => {
    if (!data) return { rides: [], refused: false };
    try {
      return { rides: receiptRides(filterRides(toRides(data), searched)), refused: false };
    } catch {
      return { rides: [], refused: true };
    }
  }, [data, searched]);

  const onAction = (action: RideAction, ride: Ride) => {
    const params = { rideno: ride.id };
    setNotice(null);
    if (action === 'feedback') {
      void openRateRide(ride.id).then((failure) => failure && setNotice({ tone: 'danger', message: failure }));
    } else if (action === 'receipt') router.push({ pathname: '/receipt', params });
    else if (action === 'voucher') router.push({ pathname: '/voucher', params });
    else router.push({ pathname: '/reservation-info', params });
  };

  return (
    <Screen title={RECEIPTS_MESSAGES.SCREEN_TITLE}>
      <Stack.Screen options={{ title: RECEIPTS_MESSAGES.SCREEN_TITLE }} />

      <RideSearchForm
        value={filters}
        onChange={setFilters}
        onSubmit={() => {
          // Same inputs → same request key, so an unchanged search refetches explicitly.
          if (JSON.stringify(filters) === JSON.stringify(searched)) refetch();
          setSearched(filters);
        }}
        today={today}
        earliest={earliest}
        searching={isLoading}
      />

      {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

      <RideResults
        title={RECEIPTS_MESSAGES.LIST_TITLE}
        rides={rides}
        range={{ from: searched.from, to: searched.to }}
        loading={isLoading}
        searched
        failed={isError || refused}
        failedTitle={RECEIPTS_MESSAGES.FAILED}
        emptyTitle={RECEIPTS_MESSAGES.EMPTY}
        onRetry={refetch}
        onAction={onAction}
      />

      <WebsiteLinkList
        title={WEBSITE_MESSAGES.RECEIPTS_TITLE}
        links={[
          { label: WEBSITE_MESSAGES.DOWNLOAD_RECEIPT, page: 'downloadReceipt' },
          { label: WEBSITE_MESSAGES.DOWNLOAD_INVOICE, page: 'downloadInvoice' },
        ]}
      />
    </Screen>
  );
}
