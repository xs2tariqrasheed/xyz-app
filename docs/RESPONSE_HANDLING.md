# Response Handling & Rendering

A simple, reusable way to handle API responses and show the data on screen. It doesn't depend on any language, framework or library, and it works whatever shape your backend's data takes.

---

## 1. The idea

Every response goes through the same five steps, in the same order:

```
1. Receive   →  get the raw response
2. Read      →  turn it into a usable object (e.g. parse text)
3. Check     →  decide: success or error?
4. Map       →  convert the data into the shape the screen needs
5. Render    →  show the data, or show the error
```

Each step does one job. The screen only takes part in step 5.

---

## 2. Step 1: Receive

Send the request through **one shared function**. Don't call the server separately from each screen.

That shared function is the only place that knows:
- the server address,
- how to attach login or auth details,
- how long to wait before giving up,
- how many times to retry.

```
response = callApi(action, params)
```

---

## 3. Step 2: Read

Responses can arrive as text or as a ready-made object. Normalize them once:

```
if response is text:
    try   data = parseJson(response)
    catch → error of type "parsing"
else:
    data = response
```

---

## 4. Step 3: Check

Decide whether the call succeeded. Every backend signals this differently, so write **one small function** that knows your backend's rule:

```
function checkResponse(data):
    if <backend says OK>:
        return { success: true,  data: data }
    else:
        return { success: false, message: <backend error text>, type: "api" }
```

How different backends signal success:

| Backend style | Success when |
|---|---|
| Status code inside the body | `header.code == 0` |
| HTTP status only | status is 200–299 |
| Flag in the body | `success == true` |
| Error field | `error` is empty or missing |

Only this function changes between projects. Everything else stays the same.

### Error types

Group every failure into one of three types:

| Type | Meaning | Retry? |
|---|---|---|
| `network` | No connection, timeout, server down | Yes, a few times with a growing delay |
| `api` | The server answered but said no (wrong password, invalid input) | **No.** The answer won't change |
| `parsing` | The response couldn't be read | No |

If the server rejects the login session, refresh it once, then retry.

---

## 5. Step 4: Map

Convert the raw data into a **simple, predictable shape** before it reaches the screen. The screen should never deal with the raw response.

Write **one mapper per response shape**. The output is always plain objects with named fields.

### Shape A: columns + rows (table style)

The server sends column names separately from the values:

```json
{
  "columns": ["id", "status", "pickup"],
  "rows": [
    ["R1001", "Confirmed", "JFK Airport"],
    ["R1002", "Cancelled", "Times Square"]
  ]
}
```

Mapper: pair each value with its column name.

```
function mapTable(data):
    result = []
    for each row in data.rows:
        item = {}
        for i, column in data.columns:
            item[column] = row[i]
        result.add(item)
    return result
```

### Shape B: list of objects

```json
{ "items": [ { "id": "R1001", "status": "Confirmed" } ] }
```

Mapper: just pick the list.

```
function mapList(data):
    return data.items or []
```

### Shape C: single record

```json
{ "user": { "id": "42", "name": "Sara" } }
```

Mapper: return the one object.

```
function mapRecord(data):
    return data.user or {}
```

### Output (same for every shape)

```
[
  { id: "R1001", status: "Confirmed", pickup: "JFK Airport" },
  { id: "R1002", status: "Cancelled", pickup: "Times Square" }
]
```

Because every mapper returns this same simple shape, screens never need to change when the backend format changes. Only the mapper does.

### Mapping rules

- Rename server field names into readable app names here, not in the screen.
- Fill in defaults for missing fields (empty text, `0`, empty list).
- Convert types here: dates, numbers, yes/no flags.
- Map once and keep the result. Don't re-map on every redraw.

---

## 6. Step 5: Render

The screen handles only four states:

| State | Show |
|---|---|
| Loading | A spinner or placeholder |
| Error | The error message (see section 7) |
| Empty | A friendly "nothing here" message |
| Data | The list or record |

```
if loading:      show Loader
else if error:   show Error
else if empty:   show EmptyMessage
else:            show Data
```

### Rendering rules

- **Lists:** draw one row per item, and give each row a stable key (like `id`), not its position in the list.
- **Single record:** read fields directly (`user.name`).
- **Missing values:** always fall back to a default so the screen never crashes on missing data.
- **Shared data** (like the logged-in user): save it in one central place after mapping, and let every screen read from there.

---

## 7. Showing errors

Show errors from **one central place** so the user never sees two messages for one problem.

```
on failure:
    message = friendlyMessage(error)
    showErrorPopup(message)
```

### Turning raw errors into friendly messages

| Situation | Message to show |
|---|---|
| `network` | "Please check your connection and try again." |
| `parsing` | "Something went wrong. Please try again." |
| `api` with readable text | The server's message |
| `api` with technical text (database codes, stack traces) | A general message, never the raw text |

A good error popup includes:
- a short title,
- the friendly message,
- a way to contact support,
- the technical detail and the time (small text), to help support find the problem.

### Silent calls

For background calls where an error popup would be annoying, add an option to **turn off the central popup**, and let that screen decide what to show.

---

## 8. Full example

```
// Shared (written once per project)
function request(action, params):
    raw    = callApi(action, params)          // Step 1
    data   = read(raw)                         // Step 2
    result = checkResponse(data)               // Step 3
    if not result.success:
        showErrorPopup(friendlyMessage(result))
        throw result
    return result.data

// Screen
state = loading
try:
    data  = request("getTrips", { type: "upcoming" })
    trips = mapTable(data)                      // Step 4
    state = trips is empty ? empty : showData(trips)
catch:
    state = error                               // popup already shown
render(state)                                   // Step 5
```

---

## 9. Checklist for a new project

- [ ] One shared function sends every request
- [ ] One `checkResponse` function knows your backend's success rule
- [ ] Every failure is grouped as `network`, `api` or `parsing`
- [ ] Only `network` errors are retried
- [ ] One mapper per response shape, all returning plain named objects
- [ ] Screens never read the raw response
- [ ] Every screen handles loading, error, empty and data
- [ ] Missing fields have defaults
- [ ] Errors are shown from one central place, with friendly text
- [ ] Background calls can turn off the error popup
