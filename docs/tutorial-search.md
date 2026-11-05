# Tutorial search

Answers the question: *"tutorial search is not very functional — we search the
device name on iFixit and pray it exists and is spelled right."*

Everything below is measured against production, and several intuitions did not
survive the measurement.

---

## What was wrong

`IfixitTutorials.tsx` called `searchIfixit(deviceName, …)` in free text. The
adapter tried `brand + model`, then `model`, then `category`, and returned the
first non-empty guide search.

**30 devices sampled at random from production: 9 answered.**

The misses were not spelling mistakes. They were manufacturer SKUs:

```
✗ Lenovo Yoga Slim 7 ProX 14IAH7      ✓ Lenovo X1 Carbon
✗ ASUS GX650RW-LS114W                 ✓ Lenovo V15
✗ MSI 14 A12SC-007                    ✓ DELL 3500
```

Icecat gives us SKUs; iFixit indexes device families. A granularity mismatch,
not a typo problem.

Worse, some of the 9 "successes" were wrong: searching
`Lenovo ThinkPad X13s Gen 1` returned 8 guides — all of them for the **X13**
Gen 1, a different machine. Users were following instructions for a device they
do not own, with nothing on screen to say so.

---

## What was done

**Resolution first, free text second.**

1. `/suggest` resolves the device against iFixit's *device* index, which
   tolerates the variance `/search` does not — `IdeaPad Flex 3 Chrome 15IJL7`
   resolves to `Lenovo IdeaPad Flex 3 Chromebook 15IJL7`.
2. The guides attached to that device wiki are read directly. Note the endpoint
   is keyed by **title slug** — `/wikis/CATEGORY/Lenovo_ThinkPad_Z16_Gen_1` —
   the numeric `wikiid` returns nothing.
3. Only then does free-text search run, and its results are labelled `related`
   rather than presented as exact.

The response keeps `results`, so it is a drop-in change. It adds
`matchQuality`, `resolvedDevice`, `exactGuides` and `relatedGuides`.

`matchQuality` has four values, and the UI now shows a different message for
each — previously all four produced the same blank page:

| Value | Meaning | Shown |
|---|---|---|
| `exact` | guides attached to this device | the guides |
| `related` | guides for a neighbouring device | warning to verify the match |
| `device-without-guides` | iFixit knows it, nobody wrote a guide | link to the device page |
| `none` | not recognised at all | invitation to correct via autocomplete |

### The honest result

Replaying the 10 failures through the new path:

```
exact guides found  : 0
resolved, 0 guides  : 5
not resolved at all : 5
```

**No additional tutorials.** The gain is correctness, not coverage: no more
guides from the wrong device, and a page that says which kind of nothing it
found so the user can act on it.

---

## Why iFixit cannot be the answer

From `repair_records` — what users actually get repaired:

| Category | Share |
|---|---:|
| Household appliances electric | 39% |
| Textile | 14% |
| Display and sound | 11% |
| Tools electric | 6% |
| **Computer equipment / phones** | **5%** |

Computers and phones — the one segment iFixit covers well — are 5% of demand.
The 1.1M-device Icecat catalogue is skewed towards exactly the category that
matters least here, at the SKU granularity iFixit handles worst.

---

## Why YouTube was promoted, not demoted

An earlier draft of this document ranked YouTube last, on credibility grounds.
That was wrong: for a Philips kettle or a Singer sewing machine there is no
structured guide anywhere, and YouTube has real content. It is now the primary
fallback for everything non-exact, carrying an explicit "community content, not
vetted by care2repair" notice.

**Quota is the binding constraint.** A `search.list` call costs 100 units of a
10,000/day allowance — **~100 searches a day for the entire platform**. Without
protection the feature dies every morning. The adapter therefore:

- caches results for 7 days, keyed on the normalised query
- caps itself at `YOUTUBE_DAILY_BUDGET` calls (default 80)
- serves a stale entry rather than nothing when the budget is spent or the API
  fails

The gateway route also carries a 10/min throttle: it is unauthenticated and
every miss spends someone else's quota.

---

## What was considered and rejected

**Our own repair records as a tutorial source.** 195,552 records, 111,128 with
a solution — the volume looked compelling. The content does not support it:

| Solution length | Count |
|---|---:|
| under 15 characters | 23,588 |
| 15–40 | 60,172 |
| 40–100 | 24,905 |
| over 100 | 2,463 |

**75% are under 40 characters.** They are outcome labels, not instructions:
`schoongemaakt` (cleaned) 176 times, `magneet vervangen` 107, and noise like
`onbekend` (unknown) 30 and `niets` (nothing) 28. Knowing that an appliance was
"cleaned" does not tell anyone how.

There may be a narrow use as a *diagnostic* prior in the wizard's
Diagnose step — "on this appliance, the frequent faults are cleaning, magnet,
cord" — but that is a different feature and is not claimed here.

**Mirroring the iFixit ZIM archive.** Available at `download.kiwix.org/zim/
ifixit/`, ~3.3 GB per language, our four locales, quarterly, readable from Node
via `@openzim/libzim`. Rejected as a first move: it is rendered HTML that would
need re-parsing, 13 GB for four languages, a licence question to settle with
iFixit — all to improve the 5% segment.

If a local index is ever wanted, mirror the **device index** instead: the
existing `ifixit/devices` endpoint already returns structured JSON at ~146
useful bytes per entry, i.e. under 3 MB for ~19,000 categories, which
Elasticsearch (already in the stack) would index in seconds.

---

## Open

- `device_categories.ifixit_wikiid` exists, is editable in admin, and is
  **empty in production (0 of 357)** and never read. It should store the title
  slug, not the numeric id — the column name is misleading. Persisting each
  successful resolution there would make the mapping deterministic and let it
  build itself from real usage.
- The EU Right to Repair directive (2024/1799) has applied since 31 July 2026
  and obliges manufacturers to publish repair information in an accessible
  form. That is the source that will actually close the household-appliance
  gap; no technical workaround substitutes for it today.

## Sources

- [iFixit API 2.0 — Guides](https://www.ifixit.com/api/2.0/doc/Guides)
- [YouTube Data API — quota](https://developers.google.com/youtube/v3/getting-started)
- [The Free, Offline, iFixit Archive](https://www.ifixit.com/News/64006/download-every-ifixit-guide-for-free)
- [download.kiwix.org/zim/ifixit](https://download.kiwix.org/zim/ifixit/)
- [openzim/node-libzim](https://github.com/openzim/node-libzim)
- [European Commission — Directive on repair of goods](https://commission.europa.eu/law/law-topic/consumer-protection-law/directive-repair-goods_en)
