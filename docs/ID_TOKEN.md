# Gateway ID Token (App Start)

How the app gets the **IdToken** it sends as `Authorization: Bearer <IdToken>` on every gateway request. This token belongs to a **shared service account**, not to the logged-in user (see [AUTH.md](AUTH.md)).

---

## 1. When it runs

- **Every app launch:** the root of the app requests a fresh token once on start-up, even if one is already saved.
- **On HTTP `401`** from the gateway: the app requests a new token, then retries the failed request.

Nothing else refreshes it. There is no expiry timer and no refresh-token flow.

## 2. The request (AWS Cognito `InitiateAuth`)

| Item | Value |
|---|---|
| Endpoint | `POST https://cognito-idp.<REGION>.amazonaws.com/` |
| Headers | `Content-Type: application/x-amz-json-1.1`, `X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth` |
| Auth flow | `USER_PASSWORD_AUTH` |

```json
{
  "AuthFlow": "<AUTH_FLOW>",
  "ClientId": "<CLIENT_ID>",
  "AuthParameters": { "USERNAME": "<USER_NAME>", "PASSWORD": "<PASSWORD>" }
}
```

All five values (`REGION`, `AUTH_FLOW`, `CLIENT_ID`, `USER_NAME`, `PASSWORD`) come from per-environment config (staging / production). The user types nothing; these are the app's own service credentials.

## 3. The response

```json
{
  "AuthenticationResult": {
    "IdToken": "eyJ...",
    "AccessToken": "eyJ...",
    "RefreshToken": "...",
    "ExpiresIn": 3600,
    "TokenType": "Bearer"
  }
}
```

The app keeps **only `IdToken`**. It ignores `AccessToken`, `RefreshToken` and `ExpiresIn`.

## 4. Storing and using it

1. Save the `IdToken` in app state that persists on the device.
2. Just before each gateway request is sent, read the current token. If one exists, add `Authorization: Bearer <IdToken>`.
3. Because the token is read at send time, a token refreshed after a `401` is picked up automatically on the retry.

## 5. Cognito setup required

- An app client with **`USER_PASSWORD_AUTH`** enabled.
- **No client secret** on that app client, because the request sends no `SECRET_HASH`.
- A dedicated service user in the user pool, whose credentials are kept in config.

## 6. Library & cost

| Item | Detail |
|---|---|
| Library used | `@aws-sdk/client-cognito-identity-provider` (AWS SDK v3, installed 3.699.0): `CognitoIdentityProviderClient` + `InitiateAuthCommand` |
| Installed, not used | `aws-amplify`, `@aws-amplify/auth`, `@aws-amplify/core`, `@aws-amplify/react-native`. The only Amplify import is commented out. |
| Other stacks | Any HTTP client can send the request in section 2 directly. No SDK is required. |
| Billing model | Cognito user pools are billed per **monthly active user (MAU)**. One service account counts as **1 MAU**, however many devices sign in with it. |
| Free tier | 10,000 MAUs per month on the **Lite** and **Essentials** tiers. There is no free tier on **Plus**. |
| Actual cost | Not visible in the code. Check the pool's tier and AWS billing in the console. |

## 7. Behaviour to know

- If the token request fails, the error is only logged. The stored token becomes empty, and requests go out **without** the `Authorization` header until a `401` triggers a new attempt.
- The service password is shipped inside the app's config, so anyone who extracts the app can read it. For a new project, consider issuing the token from your own backend, or use Cognito's refresh token instead of storing the password.
