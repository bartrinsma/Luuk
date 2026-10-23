-- Monte Amigo: boekingen, recensies, bugs en instellingen.
CREATE TABLE IF NOT EXISTS ma_bookings (
  id          SERIAL PRIMARY KEY,
  arrival     DATE NOT NULL,
  departure   DATE NOT NULL CHECK (departure > arrival),
  status      TEXT NOT NULL DEFAULT 'bevestigd',   -- aanvraag | bevestigd | geblokkeerd | afgewezen
  guest_name  TEXT,
  email       TEXT,
  phone       TEXT,
  guests      INT,
  notes       TEXT,
  price       NUMERIC,                             -- prijsindicatie bij de aanvraag
  source      TEXT NOT NULL DEFAULT 'admin',       -- website | admin
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ma_bookings_dates_idx ON ma_bookings (arrival, departure);

CREATE TABLE IF NOT EXISTS ma_reviews (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  period      TEXT NOT NULL DEFAULT '',            -- bijv. "2024" of "juli 2024"
  body        TEXT NOT NULL,
  published   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ma_bugs (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  actual       TEXT NOT NULL,                      -- wat gaat er mis
  expected     TEXT,                               -- wat had je verwacht
  page_url     TEXT,
  priority     TEXT NOT NULL DEFAULT 'normaal',    -- laag | normaal | hoog
  reporter     TEXT,
  ticket_id    TEXT,                               -- id in tickets.onlinemetbart.nl
  ticket_error TEXT,
  synced_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ma_settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
