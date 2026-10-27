# Dorak MERN app

## Development setup

1. Install MongoDB locally or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env`.
3. Set `MONGO_URI` and replace `JWT_SECRET` with a long random value.
4. Run `npm install`.
5. Run `npm run dev`.

The React client runs at `http://localhost:5173` and proxies API requests to the Express server at `http://localhost:8000`.

## Main routes

- `#login` — business login
- `#signup` — business account creation
- `#dashboard` — authenticated business order dashboard

Business orders are scoped by the authenticated business ID in MongoDB. Customer tracking uses a public order token and does not expose the staff dashboard.
