# Gateway Hooks

The React hooks that screens use to call the API Gateway. Screens never build payloads or call HTTP directly. They pass `ActionCode`, `ViewName` and `JData` to a hook and read its state.

- Envelope and request rules: [DM.md](DM.md)
- Login flow: [AUTH.md](AUTH.md)
- Source: [src/Services/hooks/](src/Services/hooks/)

---

## 1. Which hook to use

| Hook | Use for | Runs | Endpoint |
|---|---|---|---|
| `usePostData` | Actions and writes: login, booking, update, delete | When you call `mutate(...)` | GatewayAPI |
| `useFetchData` | Reads: dropdowns, lists, profile data | Automatically on mount, and again when its inputs change | GatewayAPI |
| `useFetchDataAirport` | Flight lookups | Automatically on mount | FlightViewAPI |

All three wrap `sendApiRequest` / `sendApiRequestAirport`, which builds the envelope, attaches the token, retries, and shows the global error sheet. All three return the same two extra fields:

| Field | Meaning |
|---|---|
| `parsedData` | The response object once `JHeader.ActionCode == 0`, otherwise `undefined` |
| `errorDisplay` | A ready-made `{ title, customDescription, errorType }` for the error UI |

> Built on **react-query v3** (`useMutation` / `useQuery`). If another project uses TanStack Query v5, keep the same hook signatures and return shape, and rename `isLoading` to `isPending` for mutations.

---

## 2. `usePostData`

**Signature**
```ts
const { mutate, isLoading, isSuccess, isError, data, parsedData, errorDisplay } = usePostData();

mutate(actionCode: string, viewName: string, jData: object);
```

**Implementation** ([usePostData.ts](src/Services/hooks/usePostData.ts))
```ts
export const usePostData = <TData>() => {
  const dispatch = useDispatch();
  const mutation = useMutation<TData, any, { actionCode: string; viewName: string; data: any }>({
    mutationFn: ({ actionCode, viewName, data }) =>
      sendApiRequest(actionCode, viewName, data, dispatch),
  });

  const mutate = (actionCode: string, viewName: string, data: any) =>
    mutation.mutate({ actionCode, viewName, data });

  const errorDisplay = mutation.error?.errorDisplay ||
    (mutation.isError && mutation.error
      ? getErrorDisplay(mutation.error, mutation.error?.isApiError ? 'api' : 'network')
      : undefined);

  const parsedData = mutation.isSuccess && mutation.data
    ? (() => { const r = parseApiResponse(mutation.data); return r.success ? r.data : undefined; })()
    : undefined;

  return { isSuccess: mutation.isSuccess, isError: mutation.isError, isLoading: mutation.isLoading,
           data: mutation.data, mutate, errorDisplay, parsedData };
};
```

**Usage** ([LoginScreen.tsx](src/Screens/AuthScreens/LoginScreen.tsx))
```ts
const { mutate, isSuccess, isError, parsedData } = usePostData();

const onSubmit = () => mutate("S.USER", "LOGIN", { p_VP_LOGIN_ID: email, p_VP_PASSWORD: password });

useEffect(() => {
  if (isSuccess && parsedData) { /* map + save */ }
  if (isError) setLoading(false); // error sheet is already shown
}, [isSuccess, isError]);
```

**Notes**
- `mutate` takes **positional arguments**, not one object.
- It always uses the default 3 internal attempts. There is no `suppressGlobalError` option, so errors always open the global sheet.
- If one screen needs several different actions, create one `usePostData()` instance for each action. Each instance holds the state of its last call only.

---

## 3. `useFetchData`

**Signature**
```ts
const { data, parsedData, isLoading, isSuccess, isError, errorDisplay, refetch } =
  useFetchData(actionCode, viewName, jData, options?);

options = { suppressGlobalError?: boolean; retry?: boolean | number }  // retry default: 3
```

**Implementation** ([useFetchData.ts](src/Services/hooks/useFetchData.ts))
```ts
export const useFetchData = (actionCode, viewName, jData, options?) => {
  const dispatch = useDispatch();
  const query = useQuery(
    [actionCode, viewName, jData],                               // cache key
    () => sendApiRequest(actionCode, viewName, jData, dispatch, 3,
                         { suppressGlobalError: options?.suppressGlobalError }),
    { retry: options?.retry !== undefined ? options.retry : 3 },
  );

  const errorDisplay = query.error?.errorDisplay ||
    (query.isError && query.error ? getErrorDisplay(query.error, 'network') : undefined);

  const parsedData = query.isSuccess && query.data
    ? (() => { const r = parseApiResponse(query.data); return r.success ? r.data : undefined; })()
    : undefined;

  return { ...query, errorDisplay, parsedData };
};
```

**Usage**
```ts
// Simple read (PaymentInfo.tsx)
const { isSuccess, parsedData } = useFetchData("S.DROPDOWN", "LOGIN", JDataCountry);

// Silent read with manual refresh and no retries (SelectPickup.tsx)
const { data, isLoading, errorDisplay, refetch } =
  useFetchData("S.USER.ADDRESSES", "LOGIN", AddressJData, { suppressGlobalError: true, retry: false });
```

**Notes**
- The query key is `[actionCode, viewName, jData]`. A change to any value in `jData` triggers a new fetch, and the same key reuses the cached result.
- The query runs as soon as the component mounts, and there is no `enabled` flag. To delay a fetch, render the component only when its inputs are ready.
- `retry` is react-query's retry, which runs **on top of** the 3 internal attempts in `sendApiRequest`. For calls that are optional or run in the background, pass `retry: false` together with `suppressGlobalError: true`.

---

## 4. `useFetchDataAirport`

```ts
const { parsedData, isLoading, errorDisplay } = useFetchDataAirport(actionCode, viewName, jData);
```
This is the same as `useFetchData`, except that it calls **FlightViewAPI** and takes no `options`, so react-query's default retry applies. When you need several requests at once (for example one per time window), call `sendApiRequestAirport` directly with `Promise.all` instead (see [AirportPickup.tsx](src/Screens/MyTripScreen/AirportPickup.tsx)).

---

## 5. Required setup

1. Wrap the app in `QueryClientProvider` ([App.tsx](App.tsx)). The client uses default settings ([queryClient.ts](src/Services/queryClient.ts)).
2. Make the store available. The hooks call `useDispatch()` so a 401 can refresh the gateway token.
3. Mount `GlobalErrorProvider` inside the navigator so `showGlobalError` has somewhere to render.
4. Copy `sendApiRequest`, `parseApiResponse` and `getErrorDisplay` along with the hooks, because the hooks depend on them.

---

## 6. Conventions for screens

- Use `parsedData` for success logic. If `isSuccess` is true, `ActionCode` was already `0`.
- Don't show your own error popup for gateway errors, because the global sheet already does that. Use `isError` only to reset loading state, unless you passed `suppressGlobalError`.
- Map results with `createManagedObject` / `createManagedArray` (see [DM.md](DM.md) §6).
- Keep values that change on every render (timestamps, random IDs) out of `useFetchData`'s `jData`. Keys are compared by value, so any changing value causes a new fetch.
