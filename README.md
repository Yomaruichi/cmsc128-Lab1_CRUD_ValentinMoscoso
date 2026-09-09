# CMSC128-Todo-List

## Authors

- Lunele Iven Moscoso
- John Dave Valentin

## Tech Stack
| Layer | Language |
| --- | --- |
| Frontend | React |
| Backend | Node.js & Express.js |
| Database | Firebase |

FERN was the chosen tech stack by us because the knowledge we will gain in building a Todo list here will serve as the foundation in building our Inventory Management System as it is the most similar tech stack to the one we will use. While quite complicated for a simple Todo list app, the knowledge to be gained in using this tech stack will be massive for us in the future.

## Requirements

- Git
- npm
- Node.js (20.x+)

## Installation & Initialization

1. Clone the repo
```bash
git clone https://github.com/Yomaruichi/cmsc128-Lab1_CRUD_ValentinMoscoso.git
cd cmsc128-Lab1_CRUD_ValentinMoscoso
```

2. Set up the client
```bash
cd client
npm install
```

3. Add Firebase configs
Create a **.env.local** file inside **client/** and insert your Firebase keys
```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

4. Run the client
If you're in the root folder
```bash
cd client
npm run dev
```
else
```bash
npm run dev
```
default address: http://localhost:5173/

5. Set up the server
```bash
cd ../server
npm install
```

## Data Operations (To be filled up along the way)
