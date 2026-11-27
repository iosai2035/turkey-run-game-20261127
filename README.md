# turkey-run-game-20261127

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/iosai2035/turkey-run-game-20261127/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/iosai2035/turkey-run-game-20261127/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

**Gobble & Go** — a turkey escape game. Thanksgiving is coming, and the farmer is
coming faster. Run a plucky turkey from the farmyard, through the cornfield, and
across the kitchen itself — jumping fences, hay bales and a glowing-hot oven,
sliding under branches and spinning carving knives, grabbing corn on the way —
while the farmer chases, searches, and sprints to corner you. Reach the woods at
the end of the third stage and you escape Thanksgiving. Let the farmer catch you
and you are dinner.

## How it plays

- **Run:** the turkey runs on its own; the world scrolls past. Jump with
  **Space / ↑ / W** or a **click** (press twice for a double jump), slide under
  low hazards with **↓ / S** or a **right-click** (or a long press).
- **The farmer:** a gap meter shows how far behind he is. Hits and stumbles let
  him close in; corn and golden feathers buy distance. When he loses the trail
  he stops to search — then spots you and sprints.
- **Stages:** the farmyard, the cornfield, then the kitchen, each harder and
  faster than the last. Survive all three (1,660 m) to escape.
- **Lives & score:** three lives, corn worth 10, a golden feather 50, a pie
  slice a life back, plus distance points and a 500-point escape bonus.
- **Pause** with **P / Esc**, **mute** with **M**. Best score is kept in your browser.

Everything is drawn and sounded from code: original procedural canvas sprites
(turkey, farmer, oven, knives, farm and kitchen scenery) in a coherent autumn
palette, and a synthesised WebAudio chiptune — no image or audio files, no
network requests at all.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. (Any static server works:
`game/index.html` is the entry point, and every file it loads lives under
`game/`.) Screenshot scenes are staged with `?shot=title|play|kitchen|escaped|end&seed=N`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=57z043hx&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
