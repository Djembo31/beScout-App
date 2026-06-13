# Notes — Slice 290 Home Portfolio Floor Parity

Home previously valued holdings using `h.player.floor_price` from `get_home_dashboard_v1` only. Manager/Market value the same player through `computePlayerFloor(player)` on byIds/enriched Player shape.

Slice 290 keeps Home's RPC payload as fallback but adds held player IDs to the existing Home byIds mini-fetch. When that canonical Player is available, Home uses `computePlayerFloor` for the holding floor.

This resolves Slice 289 F-1 without broad Manager/Market changes and without reintroducing the removed full-list fetch.
