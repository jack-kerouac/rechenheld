INSERT INTO players (name) VALUES ('Florian') ON CONFLICT (name) DO NOTHING;
