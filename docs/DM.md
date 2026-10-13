# API Gateway Call Structure

How the app builds a request and calls the API Gateway. This document describes only the gateway contract and the call sequence, so it can be implemented in any language or framework.

Reference implementation: [apiService.ts](src/Services/apiService.ts)

---

## 1. The call at a glance

```
1. Get auth token       →  Bearer IdToken (AWS Cognito, service account)
2. Collect context      →  device info · client IP · GPS
3. Build envelope       →  { ActionCode, ViewName, ClientIP, JsonReq{JHeader, JMetaData, JData}, Notes }
4. POST to gateway      →  {API_URL}/Development/GatewayAPI
5. Read JHeader         →  ActionCode == 0 ? success : business error
6. Map JData            →  rows/columns → keyed objects using JMetaData.Headings
```

Every operation goes through the same endpoint. **`ActionCode` + `ViewName` choose the backend operation**, and **`JData` carries its parameters**.

---

## 2. Endpoint & HTTP

| Item | Value |
|---|---|
| Method | `POST` |
| URL | `{API_URL}/Development/GatewayAPI` |
| Flight lookups | `{API_URL}/Development/FlightViewAPI` (same envelope and rules) |
| Headers | `Authorization: Bearer <IdToken>` and `Content-Type: application/json` |
| Body | JSON envelope (section 4) |
| Timeout | 30 seconds |

`API_URL` comes from environment config. The `/Development/` stage is part of the path in the current app.

---

## 3. Authentication

The gateway expects a Cognito **IdToken** for an app-level service account. This token is not tied to the end user ([services.ts:154](src/Services/services.ts:154)).

| Cognito `InitiateAuth` param | Source |
|---|---|
| `AuthFlow` | `AUTH_FLOW` |
| `ClientId` | `CLIENT_ID` |
| Region | `REGION` |
| `AuthParameters.USERNAME` / `PASSWORD` | `USER_NAME` / `PASSWORD` |

The app uses the token in three steps:
- **Fetch:** it fetches the token once at app start and stores it in persisted app state.
- **Attach:** it reads the token at send time and puts it in the `Authorization` header of every request.
- **Refresh:** on HTTP `401`, it fetches a new token and retries the same request.

> End-user login is **not** Cognito. It is a normal gateway call with `ActionCode: "S.USER"` and `ViewName: "LOGIN"`.

---

## 4. Request envelope

```json
{
  "ActionCode": "S.USER",
  "ViewName": "LOGIN",
  "ClientIP": "203.0.113.10",
  "JsonReq": {
    "JHeader": {
      "Client": "",
      "Source": "",
      "Target": "",
      "DeviceType": "Apple",
      "DeviceInfo": "iPhone 15 iPhone15,4",
      "DeviceID": "<unique device id>",
      "ViewName": "LOGIN",
      "ActionCode": "S.USER",
      "ClientVersion": "",
      "APIVersion": "",
      "APILogin": "",
      "APIPassword": "",
      "RequestedURL": "",
      "Debug": "false",
      "GPSLatitude": "40.7128",
      "GPSLongitude": "-74.0060",
      "GPSSpeed": "",
      "GPSBearing": ""
    },
    "JMetaData": {},
    "JData": {
      "p_VP_COMPANY_NUM": "<company number>",
      "p_VP_ACCOUNT_NUM": "",
      "p_VP_LOGIN_ID": "user@example.com",
      "p_VP_PASSWORD": "********"
    }
  },
  "Notes": "Test Notes ..."
}
```

### Field sources

| Field | Value / source |
|---|---|
| `ActionCode`, `ViewName` | The operation being called. They are set **twice**: at the top level and inside `JHeader`. |
| `ClientIP` | The device's public IP. Falls back to `"0.0.0.0"`. |
| `JHeader.Client`, `Source`, `Target` | Env config `CLIENT`, `SOURCE`, `TARGET` |
| `JHeader.ClientVersion`, `APIVersion` | Env config `CLIENT_VERSION`, `API_VERSION` |
| `JHeader.APILogin`, `APIPassword` | Env config `API_LOGIN`, `API_PASSWORD` (gateway-level credentials) |
| `JHeader.RequestedURL` | Env config `REQUESTED_URL` |
| `JHeader.DeviceType` | `"Apple"` on iOS, `"Android"` otherwise |
| `JHeader.DeviceInfo` | `"<model> <deviceId>"` |
| `JHeader.DeviceID` | Unique device identifier |
| `JHeader.Debug` | Always `"false"` |
| `JHeader.GPSLatitude` / `GPSLongitude` | See GPS rule below. **Never empty.** |
| `JHeader.GPSSpeed` / `GPSBearing` | `JData.p_GPS_SPEED` / `JData.p_GPS_BEARING`, or `""` |
| `JMetaData` | Always `{}` on requests |
| `JData` | Operation parameters, using `p_`-prefixed keys and string values. Some operations nest objects; for example, reservations use [reservationPayload.ts](src/Utils/reservationPayload.ts). |
| `Notes` | Fixed value `"Test Notes ..."` |

All header values are sent as **strings**.

### GPS rule ([jHeaderGpsCache.ts:107](src/Services/jHeaderGpsCache.ts:107))
The app uses the first of these that gives a valid pair:
1. Coordinates already in `JData`. It checks `p_CT_PU_LATITUDE/LONGITUDE`, then `p_LATITUDE/LONGITUDE`, then `p_VPU_LATITUDE/LONGITUDE`.
2. The last known location, cached on the device.
3. One device location read per app session.
4. The fallback config `JHEADER_FALLBACK_LAT/LNG`, which defaults to `"0"`.

---

## 5. Sending the call

The envelope is built **once** per call and then sent, with retries ([apiService.ts:101](src/Services/apiService.ts:101)):

```
payload = buildEnvelope(actionCode, viewName, jData)
attempts = 0

while attempts < 3:
    try:
        res = POST(GATEWAY_URL, payload, headers = { Authorization: "Bearer " + currentToken() })
        result = parse(res.body)

        if result.JHeader.ActionCode == 0:
            return res.body                          # success

        raise BusinessError(result.JHeader.Message)  # do NOT retry

    catch BusinessError:
        throw                                        # surface to the user immediately

    catch NetworkOrHttpError as e:
        attempts += 1
        if e.status == 401:
            refreshToken()
        if attempts >= 3:
            throw NetworkError(e)
        sleep(500ms * attempts)                      # 500 ms, then 1000 ms
```

| Situation | Retry? | Action |
|---|---|---|
| `JHeader.ActionCode == 0` | No | Return the response |
| `JHeader.ActionCode != 0` | **No** | Show `JHeader.Message` and stop |
| Timeout, no connection, or HTTP error | Yes, up to 3 attempts | Linear back-off: 500 ms × attempt |
| HTTP `401` | Yes | Refresh the token, then retry |
| Body is not valid JSON or has no `JHeader` | No | Treat it as a parsing error |

---

## 6. Response envelope

```json
{
  "JHeader": {
    "ActionCode": 0,
    "Message": "",
    "SysVersion": ""
  },
  "JMetaData": {
    "Headings": [
      ["p_VP_FIRST_NAME", "First Name", "type", "default", "visibility", "TXT", "required", "0", "50", "description"]
    ]
  },
  "JData": [
    ["John"]
  ]
}
```

- The body may arrive as a **JSON string** or as an object, so handle both ([errorHandler.ts:213](src/Utils/errorHandler.ts:213)).
- Use `JHeader.ActionCode` to decide the outcome. `0` means success. Anything else is an error, and `JHeader.Message` holds the reason.
- The data is **column-oriented**. `JData` is an array of rows, and each `Headings[i]` describes column `i`.

### Mapping a response
Pair each heading with its value ([services.ts:183](src/Services/services.ts:183)):

| Heading index | Meaning |
|---|---|
| 0 | key |
| 1 | displayName |
| 2 | type |
| 3 | defaultValue |
| 4 | visibility |
| 5 | dataType |
| 6 | required |
| 7 | minLength |
| 8 | maxLength |
| 9 | description |

```
row = JData[r]
object[Headings[i][0]] = { key, displayName, …, value: row[i] }
```

- **Single record** (for example login or a profile): map `JData[0]`.
- **List** (for example dropdowns or trips): map every row.

---

## 7. Example operations

| Purpose | ActionCode | ViewName | Sample JData keys |
|---|---|---|---|
| User login | `S.USER` | `LOGIN` | `p_VP_COMPANY_NUM`, `p_VP_ACCOUNT_NUM`, `p_VP_LOGIN_ID`, `p_VP_PASSWORD` |
| Dropdown list | `S.DROPDOWN` | `LOGIN` | depends on the list |
| Mystery-charge check | `S.MYSTERY.CHARGE.REQUIRED` | `LOGIN` | `p_VP_*` profile fields |
| Flight schedule (FlightViewAPI) | `S.FLIGHT.SCHEDULE` | `ADDRESSES` | `p_COMPANY_NUM`, `p_ACCOUNT_NUM`, `ArrivalAirport`, `ArrivalDate`, `ArrivalHour`, … |

---

## 8. Implementation checklist

1. Put the env config in place: `API_URL`, `CLIENT`, `SOURCE`, `TARGET`, `CLIENT_VERSION`, `API_VERSION`, `API_LOGIN`, `API_PASSWORD`, `REQUESTED_URL`, `USER_NAME`, `PASSWORD`, `AUTH_FLOW`, `CLIENT_ID`, `REGION`.
2. Fetch the Cognito IdToken on startup and store it.
3. Write one `callGateway(actionCode, viewName, jData)` function that:
   - builds the envelope with every `JHeader` field from section 4,
   - POSTs it with the Bearer token,
   - parses `JHeader.ActionCode`,
   - applies the retry rules in section 5.
4. Never send empty GPS values. Follow the GPS rule.
5. Use `p_`-prefixed keys and string values in `JData`, and keep the key names exactly as the DB contract defines them.
6. Show `JHeader.Message` to the user on business errors, and don't retry them.
7. Map the results with `Headings` + `JData` (section 6).
