# Module 27 — API / Endpoint Catalogue

Base: `https://booking.xyzcar.com`. Auth: 🌐 anonymous · 🔒 member session. Evidence: **O** observed live (real response) · **C** contract from shipped JS (not executed because it changes data or needs a state) · **I** inferred.

## 1. Authentication & account

| Method | Path | Auth | Params | Response | Module | Ev |
|---|---|---|---|---|---|---|
| POST | `/Misc/UserLogon` | 🌐 | `email, pwd, isremember, CaptchaResponse` | `{success}` / `{success:false,message}` / `{…,constant:"1"\|"2"\|"b"}` | 02 | C |
| GET | `/Misc/Logout` | 🔒 | — | 302 `/` | 02 | O |
| POST | `/Base/VerifyLogon` | 🌐 | `email, password, phour, pmin, ppart, pdate` | `{success}` / `{success:false,message}` | 02 | C |
| POST | `/Misc/Forgot` | 🌐 | `Email, g-recaptcha-response` | HTML | 03 | C |
| POST | `/Registration/Index` | 🌐 | full registration form + `hfactive` | `{success:false,error}` / `{NextStep:"1"}` / `{reqhtml,reqhtmlscript,message}` / `{success:true,IsCC:"1"}` / HTML | 04 | C |
| POST | `/Base/VerifyUser` | 🌐 | `Email` | `{success:true,error}` = exists | 04 | C |
| POST | `/Base/VerifyCompanyName` | 🌐 | `AccountNumber, CompanyName` | `{success:true,error}` = mismatch | 04 | C |

## 2. Lookups

| Method | Path | Auth | Params | Response item | Ev |
|---|---|---|---|---|---|
| POST | `/Base/GetCountries` | 🌐 | `searchText, maxResults` | `{CountryId, CountryCode, CountryName}` | O |
| POST | `/Base/GetStates` | 🌐 | `searchText, maxResults` | `{StateId, StateCode, StateName}` | O |
| POST | `/Base/GetCities` | 🌐 | `stateCode, searchText, maxResults` | `{CityId, CityName, StateCode}` | O |
| POST | `/Base/GetStreets` | 🌐 | `stateCode, city, streetPrefix, maxResults` | `{StreetId, StreetName}` | O |
| POST | `/Base/GetCrossStreets` | 🌐 | `stateCode, city, street, crossStreetPrefix, maxResults` | `{StreetId, StreetName}` | O |
| POST | `/Base/GetAirports` | 🔒 | `searchText, maxResults, statename` | `{AirportCode, AirportName, AirportDetail, StateCode, StateName}` | O |
| POST | `/Base/GetAirportsDrop` | 🔒 | same | same | O |
| POST | `/Base/GetAirlines` | 🔒 | `searchText, maxResults` | `{AirlineId, AirlineName}` | O |
| POST | `/Base/GetLandMark` | 🔒 | `city, searchText, maxResults` | `{LandmarkName, City, StateCode, PickupPoint1..4, CrossStreet1, CrossStreet2, AreaName, Directions}` | O |
| POST | `/Base/GetPickupAddresses` | 🔒 | `maxResults` | address objects incl. synthetic ids | O |
| POST | `/Base/GetDropAddresses` | 🔒 | `maxResults` | address objects incl. `-9999` As directed | O |
| POST | `/Base/GetAddressInfo` | 🔒 | `addressid` | `{fa:{address}, CountryName, StateName}` | O |
| POST | `/Base/GetPhoneList` | 🔒 | `maxResults` | `{CompleteContactNumber, ContactTypeId}` | O (empty) / C |
| POST | `/Base/GetEmailList` | 🔒 | `maxResults` | `{ContactNumber, ContactTypeId}` | O (empty) / C |
| POST | `/Base/GetContactType` | 🔒 | `maxResults` | `{Key, Value}` | O |
| POST | `/Base/FindAddressZone` | 🔒 | `country, state, city, streetno, streetname, landmark, airport, ispickup, isairport, type` | `{success:true}` / `{success:false,error:"yes"}` | O |
| POST | `/Base/FindZoneByZip` | 🔒 | `zip, latitude, longitude, ispickup, isairport` | same | O |
| GET | `/Misc/ReturnHelpFile` | 🌐 | `filename, index` | text path | O |

## 3. Member home & profile

| Method | Path | Params | Response | Module | Ev |
|---|---|---|---|---|---|
| GET | `/MemberArea/Index` (= `/MemberArea/MemberHome`) | — | page (last login, saved address lists) | 06 | O |
| POST | `/MemberArea/MemberHome` | `Pickup, Dropoff, button3` | **[U]** express ride | 06 | C |
| GET/POST | `/MemberArea/PersonalInfo` | `FirstName, LastName, PhoneUS, ExtUS, PhoneIntAreaCode, PhoneInt, ExtInt, FaxAreaCode, Fax` | `{message}` or HTML | 07 | O/C |
| GET/POST | `/MemberArea/BillingAddress` | `Country, CountryCode, State, StateCode, City, CityCode, Zip, BuildingNo, StreetName1, StreetName2, ApartementNo, AddressPhoneUS, AddressPhoneIntAreaCode, AddressPhoneInt, IsOfficeAddress` | `{message}` or HTML | 08 | O/C |
| GET/POST | `/MemberArea/Preferences` | `chkPhone, IsSubscribed` | `{message}` or HTML | 09 | O/C |
| GET/POST | `/MemberArea/ChangePassword` | `OldPassword, NewPassword, ConfirmPassword` | `{message}` or HTML | 10 | O/C |
| GET | `/MemberArea/Addresses[?mode=2&addressid=N][&sort=&sortdir=]` | — | page / grid | 11 | O |
| POST | `/MemberArea/Addresses?mode=1&addressid=0` (create), `?mode=2&addressid=N` (update) | address fields | `{success,error}` or HTML | 11 | C |
| GET | `/MemberArea/Addresses?mode=3&addressid=N` | — | delete (GET!) | 11 | C |
| GET | `/MemberArea/AdditionalContacts` | — | page | 12 | O |
| POST | `/MemberArea/AdditionalContacts?mode=1&contacttypeid=0` | `ContactId, ContactNumber, Extension` | `{success,error}` or HTML | 12 | C |

## 4. Booking

| Method | Path | Params | Response | Module | Ev |
|---|---|---|---|---|---|
| GET | `/Reservation/Index[?isexpress=2\|istristate][&isauthorize=true][&passengerid=N][&isguest=…]` | — | wizard | 13 | O |
| POST | `/Reservation/Index` | full form (137 fields) + `hfactive` 0–3 | step JSON (`success, error, isduplicate, summary, Redirect, isavaiable, refresh, reqhtml, reqhtmlscript, islogin, confirm, header`) | 13 | C |
| POST | `/Reservation/GetCardNo` | — | `{success, cno}` (full PAN ⚠) | 16 | O |
| POST | `/Reservation/ChangeAccountNo` | `iscorporate, step, accountno?` | `{success[,acctype]}` / `{success:false,error}` | 16 | C |
| POST | `/Reservation/GetAccountMethod` | `accountno` | `{success:true, acctype:1\|2\|3}` | 16 | O |
| POST | `/Reservation/CardApproval` | `times` | `{success}` / `{success:false,message:"CCcall"\|text}` | 16 | C |
| POST | `/Reservation/LoadAuthorizeProfile` | `email, passengertype, ridereason` | `{success}` / `{success:false,error}` | 14 | C |
| POST | `/MemberArea/EmailCC` | — | HTML e-mail checkbox list | 17 | C |
| GET | `/Reservation/Trip?mode=up` | — | round-trip review page | 22 | O |
| GET | `/Reservation/Confirmation` | — | **creates round-trip reservation** from session; else 302 `Trip?mode=up` | 22 | O/C |

## 5. Rides

| Method | Path | Params | Response | Module | Ev |
|---|---|---|---|---|---|
| GET | `/MemberArea/RideSearch` | — | search page | 18 | O |
| POST | `/MemberArea/RideSearch` | `txtFromDate, txtToDate, ddlPaymentMethod` | HTML grid / `{success:false,message}` | 18 | O |
| GET | `/MemberArea/RideSearch?sort=&sortdir=` | — | grid partial | 18 | O |
| GET | `/MemberArea/RideList` | — | open reservations | 19 | O |
| POST | `/MemberArea/CancelReservation` | `rideno, from, reason` | `{success,returnurl}` / `{success:false,message}` / `{Redirect}` | 19 | C |
| GET | `/MemberArea/ReservationInfo?rideno=` | — | details page | 20 | O |
| POST | `/MemberArea/ReservationInfo` | `hfRideNo, hfFrom, txtReason` | `{success:false,message}` / HTML | 20 | C |
| GET | `/MemberArea/BackToURL` | — | 302 to originating page | 20 | O |
| GET | `/MemberArea/TrackYourRoute?rideno=` | — | event log + route data | 21 | O |
| GET | `/MemberArea/TrackYourRoutePopup?index=` | — | single event map | 21 | O |
| GET | `/MemberArea/AskQuestion` | — | question panel | 21 | O |
| POST | `/MemberArea/AskQuestion` | `rideno, questionid, message` | `{success}` | 21 | C |
| GET | `/MemberArea/ImageLoader?rideno=&ImageID=&ImagePath=` | — | voucher loader page | 23 | O |
| GET | `/MemberArea/ShowImage?rideno=&ImageID=` | — | voucher image | 23 | C |
| GET | `/MemberArea/xyzPrintVoucher?…` | unknown | printable voucher | 23 | C |
| JSONP | `http://192.168.0.151/DownloadVoucher/Default.aspx` | `ImageID, RideNo, ImagePath` | internal image server ⚠ | 23 | C |

## 6. External (marketing site, WordPress)
`/rate-a-ride/?rideno=`, `/complaint/`, `/open-an-account/`, `/download-receipt/`, `/download-invoice/` — module 24/23.

## 7. Not executed on purpose
Login, registration submit, forgot-password submit, every profile/address/contact save or delete, password change, booking step POSTs, card approval, express ride, round-trip confirmation, cancellation, ask-question submit, feedback submits. Their contracts come from the shipped client code; server-side success payloads for these (e.g. booking receipt HTML) remain **unknown**.
