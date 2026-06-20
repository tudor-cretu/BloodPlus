<div align="center">
  <img src="blood+/public/bloodplus_logo_wo_text.png" alt="Blood+ logo" width="90" />

  # Blood+

  **Find blood donation centers, see live stock levels, and get routed to where your blood type is needed most.**

  Built with React + Vite, Firebase, and the ArcGIS Maps SDK for JavaScript.
</div>

---

## Overview

Blood+ is a web application that maps blood donation centers in Bucharest, Romania, and shows the current blood-stock situation for each one in real time. Visitors can explore the map without an account; registered donors get personalized routing and recommendations based on their blood group; administrators manage centers and update stock levels.

Every center is color-coded by how critical its supply is, so users can see at a glance where blood is urgently needed — and donors can be guided straight to the center where their donation will have the most impact.

> The user interface is in **Romanian**.

---

## Features

### For everyone (guest mode)
- **Interactive map** of donation centers centered on Bucharest (ArcGIS basemap).
- **Color-coded markers** reflecting each center's stock status:
  - 🔴 **Critical** — at least one blood group is at 0 units
  - 🟠 **Warning** — at least one blood group is below 10 units
  - 🟢 **Normal** — all groups have 10+ units
- **Center details popup**: address, email, phone, opening hours, and a full breakdown of all 8 blood groups with per-group quantities.
- **Address search & routing**: search any address, drop a pin, and click **"Find the nearest center"** to compute a driving route with distance and travel time.

### For registered donors
- **Email/password authentication** (Firebase Auth).
- **Personalized recommendation**: a scoring algorithm suggests the best center to donate at for *your* blood group, balancing **stock urgency (70%)** and **proximity (30%)**, then routes you there.
- **Need heatmap**: an intensity overlay across Bucharest + Ilfov highlighting where your blood group is most scarce (red hotspots = critical, green = well-stocked).
- **Filters**: limit centers by maximum distance (1–50 km) and by blood group below a chosen stock threshold.
- **Account page**: view your profile, change your password, or delete your account.

### For administrators
- **Center management panel**: edit any center's details (name, address, coordinates, contact info, hours) and adjust per-group blood-stock quantities inline.
- **Add new centers**: new centers are automatically initialized with all 8 blood groups at 0 units.
- **Delete centers** (including their stock subcollection).

---

## Tech stack

| Area | Technology |
| --- | --- |
| UI | [React 19](https://react.dev/) |
| Build tool | [Vite 7](https://vite.dev/) |
| Routing | [React Router 7](https://reactrouter.com/) |
| Maps / geocoding / routing / heatmap | [ArcGIS Maps SDK for JavaScript 4](https://developers.arcgis.com/javascript/latest/) (`@arcgis/core`) |
| Auth & database | [Firebase 12](https://firebase.google.com/) (Authentication + Cloud Firestore) |
| Data seeding | [Firebase Admin SDK 13](https://firebase.google.com/docs/admin/setup) |
| Linting | [ESLint 9](https://eslint.org/) |

---

## Project structure

The application lives in the [`blood+/`](blood+/) directory.

```
blood+/
├── index.html
├── package.json
├── vite.config.js
├── seed.js                      # Entry point for seeding Firestore (npm run seed)
├── public/
│   └── bloodplus_logo_wo_text.png
└── src/
    ├── main.jsx                 # App entry + React Router routes
    ├── App.jsx                  # Auth/guest gate + map screen
    ├── AuthPage.jsx             # Login / register / continue-as-guest
    ├── MapComponent.jsx         # The core ArcGIS map: markers, search,
    │                            #   routing, recommendation, heatmap, filters
    ├── AdminPage.jsx            # Admin: list & edit centers + stock
    ├── AddCentersPage.jsx       # Admin: add a new center
    ├── UserPage.jsx             # Donor: profile, change password, delete account
    ├── utils/
    │   └── getNextCenterId.js   # Generates the next sequential center ID
    └── firebase/
        ├── firebaseConfig.js    # Firebase web app initialization (Firestore + Auth)
        ├── firebaseCollections.js  # Collection / subcollection name constants
        ├── firebaseService.js   # Firestore collection references
        ├── models.js            # Documented data shapes (centers, users, stock)
        ├── seedCenters.js       # Sample Bucharest centers + stock seed data
        └── firebaseAdmin.js     # Firebase Admin init (Node, service account)
```

### Routes

| Path | Page | Audience |
| --- | --- | --- |
| `/` | Auth gate, then the map | Everyone |
| `/account` | Donor profile | Donors |
| `/admin` | Center management | Admins |
| `/admin/add-center` | Add a new center | Admins |

---

## Data model (Cloud Firestore)

```
centers (collection)
└── {centerId} (document)
    ├── name: string
    ├── address: string
    ├── latitude: number
    ├── longitude: number
    ├── contact_phone: string
    ├── contact_email: string
    ├── program: string            # opening hours, e.g. "L-V 07:30 - 13:30"
    └── blood_stock (subcollection)
        └── {stockId} (document)
            ├── stock_id: string
            ├── blood_group: string   # A+, A-, B+, B-, AB+, AB-, 0+, 0-
            └── quantity: number

users (collection)
└── {uid} (document)               # uid = Firebase Auth user id
    ├── name: string
    ├── email: string
    ├── role: "donor" | "admin"
    ├── blood_group: string
    └── createdAt: number
```

Anyone who registers is created with the `donor` role. To grant a user the **admin** role (which reveals the Admin Panel button), change their `role` field to `"admin"` directly in the Firestore console.

---

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) (with npm)
- A **Firebase** project with **Cloud Firestore** and **Email/Password authentication** enabled
- An **ArcGIS API key** ([developers.arcgis.com](https://developers.arcgis.com/)) for the basemap, geocoding, and routing services

### 1. Install dependencies

```bash
cd blood+
npm install
```

### 2. Configure the ArcGIS API key

The map reads the key from `import.meta.env.VITE_ARCGIS_API_KEY`. Create a `.env.local` file inside `blood+/`:

```env
VITE_ARCGIS_API_KEY=your_arcgis_api_key_here
```

### 3. Configure Firebase

Firebase web configuration is currently set in [`src/firebase/firebaseConfig.js`](blood+/src/firebase/firebaseConfig.js). To use your own Firebase project, replace the `firebaseConfig` object there with your project's values, then enable **Email/Password** auth and **Cloud Firestore** in the Firebase console.

> Firebase web API keys are safe to expose in client code — access is controlled by your **Firestore security rules**, so be sure to configure those for production.

### 4. Run the dev server

```bash
npm run dev
```

Vite prints a local URL (default `http://localhost:5173`). Open it in your browser.

---

## Available scripts

Run these from the `blood+/` directory:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot-reload |
| `npm run build` | Build the production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint over the project |
| `npm run seed` | Populate Firestore with the sample centers from `seedCenters.js` |

---

## Seeding sample data

The repo ships with sample data for four real Bucharest transfusion centers (with per-group stock) in [`src/firebase/seedCenters.js`](blood+/src/firebase/seedCenters.js). To load it into Firestore:

```bash
npm run seed
```

This writes each center and its `blood_stock` subcollection to your configured Firebase project. Make sure your Firestore security rules allow the writes (or run it against a development project).

---

## How it works

- **Auth & mode** — `App.jsx` stores the chosen mode in `localStorage` (`app_mode = "guest" | "user"`). Authenticated sessions are tracked with Firebase's `onAuthStateChanged`, which loads the matching `users/{uid}` document to determine role and blood group.
- **Map rendering** — `MapComponent.jsx` loads every center (and its stock) from Firestore, builds a client-side ArcGIS `FeatureLayer`, and renders each center with a unique-value symbol based on its computed criticality level.
- **Routing** — uses the ArcGIS World Route service to draw the driving route from the searched location to the chosen center, returning distance and estimated travel time.
- **Recommendation** — scores every center as `0.7 × stock_urgency + 0.3 × proximity` for the donor's blood group and routes to the highest-scoring one.
- **Heatmap** — builds a weighted ArcGIS heatmap layer (more overlapping points where stock is lower) restricted to the Bucharest + Ilfov area, shown only to logged-in users who have a blood group.

---

## Contributors

- Tudor Crețu ([@tudor-cretu](https://github.com/tudor-cretu))
- Ruxandra Diaconu
- Diana Chelaru

---

## License

No license has been specified for this project. If you intend to reuse or distribute it, please contact the authors.
