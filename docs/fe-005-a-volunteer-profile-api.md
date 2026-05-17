# FE-005-A: Current Volunteer Profile API

This API already exists in the backend.

Base path: `/api`

Current volunteer profile routes:

- `GET /api/volunteers/me/profile`
- `POST /api/volunteers/me/profile`
- `PUT /api/volunteers/me/profile`

These routes are implemented in [src/controllers/VolunteerController.ts](/Volumes/Projects/proiectIp/src/controllers/VolunteerController.ts) and backed by [src/services/VolunteerService.ts](/Volumes/Projects/proiectIp/src/services/VolunteerService.ts).

## What FE can read and save

The current volunteer profile contract already supports:

- `maxDistanceKm`
- `currentLocation`
- `knownLocations[]`

The data is stored in:

- `volunteer_profiles.max_distance_km`
- `volunteer_profiles.current_location`
- `volunteer_known_locations`

Schema source: [src/db/profile.ts](/Volumes/Projects/proiectIp/src/db/profile.ts)

## Auth

All `/me/profile` routes require an authenticated session.

If the session is missing, the API returns `401 Unauthorized`.

## Response envelope

Successful responses use the common API envelope:

```json
{
  "data": {},
  "message": "Request completed successfully",
  "notFound": false,
  "isUnauthorized": false,
  "isForbidden": false,
  "isServerError": false,
  "isClientError": false,
  "app": {
    "url": "http://localhost:3000"
  },
  "statusCode": 200
}
```

Envelope source: [src/utils/apiReponse.ts](/Volumes/Projects/proiectIp/src/utils/apiReponse.ts)

## GET /api/volunteers/me/profile

Reads the current volunteer profile.

### Success response

Status: `200 OK`

```json
{
  "data": {
    "volunteer": {
      "id": 1,
      "userId": "user-1",
      "availability": true,
      "trustScore": 4.5,
      "completedTasks": 10
    },
    "profile": {
      "id": 1,
      "volunteerId": 1,
      "skills": ["cooking", "driving"],
      "maxDistanceKm": 10,
      "currentLocation": {
        "x": 27.58,
        "y": 47.16
      },
      "knownLocations": [
        {
          "id": 1,
          "city": "Iasi",
          "addressText": "Centru",
          "location": {
            "x": 27.58,
            "y": 47.16
          }
        }
      ]
    }
  },
  "message": "Request completed successfully",
  "notFound": false,
  "isUnauthorized": false,
  "isForbidden": false,
  "isServerError": false,
  "isClientError": false,
  "app": {
    "url": "http://localhost:3000"
  },
  "statusCode": 200
}
```

### Notes

- `profile` can be `null` if the volunteer exists but has no volunteer profile yet.
- `currentLocation` is normalized to `null` when missing.
- `knownLocations` is normalized to `[]` when missing.

### Not found

Status: `404 Not Found`

Returned when the current user does not have a volunteer record yet.

## POST /api/volunteers/me/profile

Creates the current volunteer profile.

### Request body

All fields are optional:

```json
{
  "skills": ["cooking"],
  "maxDistanceKm": 10,
  "currentLocation": {
    "x": 27.58,
    "y": 47.16
  },
  "knownLocations": [
    {
      "city": "Iasi",
      "addressText": "Centru",
      "location": {
        "x": 27.58,
        "y": 47.16
      }
    }
  ],
  "availability": true
}
```

### Validation

- `maxDistanceKm`: positive number, nullable, optional
- `currentLocation`: `{ x: number, y: number } | null`
- `knownLocations`: array of objects with:
  - `city?: string | null`
  - `addressText?: string | null`
  - `location: { x: number, y: number }`
- `availability?: boolean`
- `skills?: string[]`

### Success response

Status: `201 Created`

Returns the same shape as `GET /api/volunteers/me/profile`.

### Important behavior

- If the user has no `volunteer` row yet, the backend creates it automatically.
- If `knownLocations` is provided, the backend stores that list.
- If `knownLocations` is omitted, no known locations are inserted.
- If a volunteer profile already exists, the API returns `400`.

## PUT /api/volunteers/me/profile

Updates the current volunteer profile.

### Request body

All fields are optional:

```json
{
  "maxDistanceKm": 20,
  "currentLocation": {
    "x": 27.6,
    "y": 47.1
  },
  "knownLocations": [
    {
      "city": "Iasi",
      "addressText": "Copou",
      "location": {
        "x": 27.6,
        "y": 47.1
      }
    }
  ]
}
```

### Success response

Status: `200 OK`

Returns the same shape as `GET /api/volunteers/me/profile`.

### Important behavior

- If a field is omitted, it is left unchanged.
- If `currentLocation` is sent as `null`, it is cleared.
- If `maxDistanceKm` is sent as `null`, it is cleared.
- If `knownLocations` is provided, it fully replaces the previous list.
- If `knownLocations: []` is sent, all known locations are removed.
- If `knownLocations` is omitted, the previous list remains unchanged.

### Not found

Status: `404 Not Found`

Returned when:

- the current user is not a volunteer
- the volunteer profile does not exist yet

## FE recommendation

For FE-005-A, the backend contract is already present and can be used directly.

Recommended FE usage:

1. Call `GET /api/volunteers/me/profile` when opening the volunteer settings screen.
2. Read from `data.profile.maxDistanceKm`.
3. Read from `data.profile.currentLocation`.
4. Read from `data.profile.knownLocations`.
5. Use `POST` the first time a profile is created.
6. Use `PUT` for later edits.

## Code references

- [src/controllers/VolunteerController.ts](/Volumes/Projects/proiectIp/src/controllers/VolunteerController.ts)
- [src/services/VolunteerService.ts](/Volumes/Projects/proiectIp/src/services/VolunteerService.ts)
- [src/db/repositories/volunteer.repository.ts](/Volumes/Projects/proiectIp/src/db/repositories/volunteer.repository.ts)
- [src/db/profile.ts](/Volumes/Projects/proiectIp/src/db/profile.ts)
- [tests/controllers/volunteerProfileController.test.ts](/Volumes/Projects/proiectIp/tests/controllers/volunteerProfileController.test.ts)
