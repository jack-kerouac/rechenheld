INSERT INTO players (name) VALUES ('Florian') ON CONFLICT (name) DO NOTHING;

INSERT INTO rounds (player_id, stufe, started_at, finished_at, correct_count, calculations)
VALUES
  -- Stufe 1: 3 rounds
  (
    (SELECT id FROM players WHERE name = 'Florian'), 1,
    now() - interval '4 days',
    now() - interval '4 days' + interval '45 seconds',
    10,
    '[{"a":3,"b":4,"op":"+","answer":7},{"a":1,"b":5,"op":"+","answer":6},{"a":2,"b":3,"op":"+","answer":5},{"a":4,"b":2,"op":"+","answer":6},{"a":1,"b":8,"op":"+","answer":9},{"a":3,"b":6,"op":"+","answer":9},{"a":2,"b":5,"op":"+","answer":7},{"a":1,"b":3,"op":"+","answer":4},{"a":4,"b":4,"op":"+","answer":8},{"a":2,"b":7,"op":"+","answer":9}]'::jsonb
  ),
  (
    (SELECT id FROM players WHERE name = 'Florian'), 1,
    now() - interval '3 days',
    now() - interval '3 days' + interval '52 seconds',
    8,
    '[{"a":3,"b":4,"op":"+","answer":7},{"a":1,"b":5,"op":"+","answer":6},{"a":2,"b":3,"op":"+","answer":5},{"a":4,"b":2,"op":"+","answer":6},{"a":1,"b":8,"op":"+","answer":9},{"a":3,"b":6,"op":"+","answer":9},{"a":2,"b":5,"op":"+","answer":7},{"a":1,"b":3,"op":"+","answer":4},{"a":4,"b":4,"op":"+","answer":8},{"a":2,"b":7,"op":"+","answer":9}]'::jsonb
  ),
  (
    (SELECT id FROM players WHERE name = 'Florian'), 1,
    now() - interval '2 days',
    now() - interval '2 days' + interval '41 seconds',
    7,
    '[{"a":3,"b":4,"op":"+","answer":7},{"a":1,"b":5,"op":"+","answer":6},{"a":2,"b":3,"op":"+","answer":5},{"a":4,"b":2,"op":"+","answer":6},{"a":1,"b":8,"op":"+","answer":9},{"a":3,"b":6,"op":"+","answer":9},{"a":2,"b":5,"op":"+","answer":7},{"a":1,"b":3,"op":"+","answer":4},{"a":4,"b":4,"op":"+","answer":8},{"a":2,"b":7,"op":"+","answer":9}]'::jsonb
  ),
  -- Stufe 2: 2 rounds
  (
    (SELECT id FROM players WHERE name = 'Florian'), 2,
    now() - interval '2 days' + interval '2 hours',
    now() - interval '2 days' + interval '2 hours' + interval '65 seconds',
    10,
    '[{"a":5,"b":3,"op":"+","answer":8},{"a":7,"b":2,"op":"-","answer":5},{"a":3,"b":4,"op":"+","answer":7},{"a":9,"b":4,"op":"-","answer":5},{"a":2,"b":5,"op":"+","answer":7},{"a":8,"b":3,"op":"-","answer":5},{"a":4,"b":4,"op":"+","answer":8},{"a":6,"b":1,"op":"-","answer":5},{"a":3,"b":6,"op":"+","answer":9},{"a":7,"b":3,"op":"-","answer":4}]'::jsonb
  ),
  (
    (SELECT id FROM players WHERE name = 'Florian'), 2,
    now() - interval '1 day',
    now() - interval '1 day' + interval '70 seconds',
    6,
    '[{"a":5,"b":3,"op":"+","answer":8},{"a":7,"b":2,"op":"-","answer":5},{"a":3,"b":4,"op":"+","answer":7},{"a":9,"b":4,"op":"-","answer":5},{"a":2,"b":5,"op":"+","answer":7},{"a":8,"b":3,"op":"-","answer":5},{"a":4,"b":4,"op":"+","answer":8},{"a":6,"b":1,"op":"-","answer":5},{"a":3,"b":6,"op":"+","answer":9},{"a":7,"b":3,"op":"-","answer":4}]'::jsonb
  ),
  -- Stufe 3: 2 rounds
  (
    (SELECT id FROM players WHERE name = 'Florian'), 3,
    now() - interval '6 hours',
    now() - interval '6 hours' + interval '80 seconds',
    9,
    '[{"a":8,"b":7,"op":"+","answer":15},{"a":13,"b":4,"op":"-","answer":9},{"a":11,"b":6,"op":"+","answer":17},{"a":15,"b":8,"op":"-","answer":7},{"a":9,"b":9,"op":"+","answer":18},{"a":14,"b":6,"op":"-","answer":8},{"a":12,"b":5,"op":"+","answer":17},{"a":16,"b":7,"op":"-","answer":9},{"a":10,"b":8,"op":"+","answer":18},{"a":11,"b":3,"op":"-","answer":8}]'::jsonb
  ),
  (
    (SELECT id FROM players WHERE name = 'Florian'), 3,
    now() - interval '2 hours',
    now() - interval '2 hours' + interval '72 seconds',
    10,
    '[{"a":8,"b":7,"op":"+","answer":15},{"a":13,"b":4,"op":"-","answer":9},{"a":11,"b":6,"op":"+","answer":17},{"a":15,"b":8,"op":"-","answer":7},{"a":9,"b":9,"op":"+","answer":18},{"a":14,"b":6,"op":"-","answer":8},{"a":12,"b":5,"op":"+","answer":17},{"a":16,"b":7,"op":"-","answer":9},{"a":10,"b":8,"op":"+","answer":18},{"a":11,"b":3,"op":"-","answer":8}]'::jsonb
  );
