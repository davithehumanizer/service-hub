import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { normalizeRepairerDeviceTypeKey, repairerDeviceTypeFor, translateRepairerDeviceType } from '../utils/repairerDeviceTypeUtils';
import { PARTNER_CATEGORIES, PARTNER_CATEGORY_ICON, PartnerCategory, parsePartnerCategories } from '../utils/partnerTypes';
import { DEVICE_TYPE_GROUPS, getDeviceTypeGroup } from '../utils/repairerDeviceGroups';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-markercluster/styles";
import L from "leaflet";
import { repairerService, RepairerMarker } from "../services/repairerService";
import RepairerPopupBody from "../components/RepairMap/RepairerPopupBody";
import LocationAutocomplete, { PickedLocation } from "../components/RepairMap/LocationAutocomplete";
import { Repairer, RepairerFilters } from "../models/repairer";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../stores/globalStore";
import { setGeolocation } from "../stores/authSlice";
import { clearGlobalDevice } from "../stores/deviceSlice";
import { setIssues } from "../stores/repairWorkflowSlice";
import { Link, useHistory, useLocation } from "react-router-dom";
import { useDebounce } from "../utils/useDebounce";
import { Button, Pagination, SegmentedControl } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Input, Select } from "@windmill/react-ui";
import { getCountryName } from "../utils/countryMapper";
import DemoBadge from "../components/Devices/DemoBadge";
import { getIssueLabel } from "../utils/issueMapping";
import MarkerClusterGroup from "react-leaflet-markercluster";
import marker from'../assets/img/marker-icon.png';
import markerhighlight from'../assets/img/marker-icon-highlight.png';
import { ADEME_DATASET } from '../utils/dataAttribution';


const customIcon = new L.Icon({
  iconUrl:marker,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const highlightedIcon = new L.Icon({
  iconUrl: markerhighlight,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const userLocationIcon = L.divIcon({
  html: '<span class="material-symbols-outlined text-blue-500 text-4xl">person_pin_circle</span>',
  className: 'custom-div-icon', // Add a class for potential additional styling if needed
  iconSize: [40, 40], // Adjust size as needed
  iconAnchor: [20, 40], // Adjust anchor to center the icon
  popupAnchor: [0, -30], // Adjust popup anchor
});

/**
 * Draws a cluster bubble sized by how many pins it stands for.
 *
 * The plugin's own icon is a fixed 40px circle in a green/yellow/orange scale,
 * so a group of two and a group of nineteen look alike and the colour reads as
 * a severity rather than a count. Building the icon here gives the count a
 * diameter — the one property the eye reads before the digits — and keeps the
 * palette to the map's own purple, with white numerals at every size.
 *
 * Four steps rather than a continuous scale: adjacent bubbles need to be
 * comparable at a glance, and a smooth ramp makes 7 and 9 differ by a pixel.
 */
const clusterIcon = (cluster: { getChildCount: () => number }) => {
  const count = cluster.getChildCount();
  const step =
    count < 10 ? 'sm' : count < 50 ? 'md' : count < 200 ? 'lg' : 'xl';
  const size = { sm: 32, md: 40, lg: 48, xl: 58 }[step];

  return L.divIcon({
    html: `<span>${count}</span>`,
    className: `c2r-cluster c2r-cluster-${step}`,
    iconSize: L.point(size, size),
  });
};

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

/** Visible map rectangle, as Leaflet reports it. */
type Bounds = { north: number; south: number; east: number; west: number };

/**
 * How long the map must sit still before we ask the server again.
 *
 * A pan fires `moveend` once, but a pinch-zoom or a flick fires several in
 * quick succession; without this each one would start its own request and the
 * last answer to arrive would win, which is not necessarily the last asked.
 */
const BOUNDS_DEBOUNCE_MS = 400;

const readBounds = (map: any): Bounds => {
  const b = map.getBounds();
  return {
    north: b.getNorth(),
    south: b.getSouth(),
    east: b.getEast(),
    west: b.getWest(),
  };
};

/**
 * Watches the map and reports what changed.
 *
 * Two different reports, because moving the map and searching it are two
 * different acts. Panning only *offers* a new area — `onMoved` raises the
 * "search here" prompt and nothing is fetched. The first usable rectangle is
 * different: there is nothing on screen yet to keep, so it is applied straight
 * away through `onSettled`.
 */
function MapMoveHandler({
  isProgrammatic,
  onMoved,
  onSettled,
  onPopupOpenChange,
}: {
  isProgrammatic: React.MutableRefObject<boolean>;
  onMoved: (view: { bounds: Bounds; center: { lat: number; lng: number } }) => void;
  onSettled: (bounds: Bounds) => void;
  onPopupOpenChange: (isOpen: boolean) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      // Flying to a marker or recentring on the user is not the user asking to
      // search somewhere else, so it must not raise the prompt. The flag stays
      // set for the whole move — one gesture can settle several times.
      if (isProgrammatic.current) return;
      onMoved({ bounds: readBounds(map), center: map.getCenter() });
    },
    // The map mounts inside a container that has no width yet, so Leaflet
    // caches a zero-width viewport and getBounds() reports east === west — a
    // rectangle of no width, which matched almost nothing and left the map
    // showing a single pin. Nothing else fires once the layout settles, so
    // this is the event that produces the first usable rectangle.
    resize: () => onSettled(readBounds(map)),
    popupopen: () => onPopupOpenChange(true),
    popupclose: () => onPopupOpenChange(false),
  });

  // `moveend` never fires for the initial view. invalidateSize() makes Leaflet
  // re-measure first, so this read is against the laid-out container rather
  // than the zero-width one it was created in.
  useEffect(() => {
    map.invalidateSize();
    onSettled(readBounds(map));
  }, [map]);

  return null;
}

const RepairMapPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [repairers, setRepairers] = useState<Repairer[]>([]);
  const [totalRepairers, setTotalRepairers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('q') ?? '');
  const debouncedSearch = useDebounce(search, 500); // 500ms de délai
  const [filters, setFilters] = useState<RepairerFilters[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<{
    [key: string]: string;
  }>({});
  // The kinds of place shown, none meaning all. ?type= presets them from where
  // the map was opened (the wizard's repairer, reuse or recycling option), and
  // keeps them for Back.
  const [partnerTypes, setPartnerTypes] = useState<PartnerCategory[]>(() =>
    parsePartnerCategories(new URLSearchParams(location.search).get('type')),
  );
  const [hoveredRepairer, setHoveredRepairer] = useState<Repairer | null>(null);
  const [selectedRepairer, setSelectedRepairer] = useState<Repairer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [useLocationSort, setUseLocationSort] = useState(true);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Markers are fetched separately from the list: four fields per pin instead
  // of whole entities, so the map can show everything in view while the list
  // stays paginated.
  const [markers, setMarkers] = useState<RepairerMarker[]>([]);
  const [markersTotal, setMarkersTotal] = useState(0);
  const [markersTruncated, setMarkersTruncated] = useState(false);
  // The rectangle actually searched. Panning does not change it — only the
  // first settled view and "search here" do — so the pins stay where the user
  // last asked for them instead of chasing every drag.
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const debouncedBounds = useDebounce(bounds, BOUNDS_DEBOUNCE_MS);
  /** The area on offer once the map has been moved, applied only on request. */
  const [pendingView, setPendingView] = useState<{ bounds: Bounds; center: { lat: number; lng: number } } | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [reportingRepairerId, setReportingRepairerId] = useState<string | null>(null);
  const [reportedRepairerIds, setReportedRepairerIds] = useState<Set<string>>(new Set());

  const device = useSelector((state: RootState) => state.device.globalDevice);
  const userLatitude = useSelector((state: RootState) => state.auth.latitude);
  const userLongitude = useSelector((state: RootState) => state.auth.longitude);
  const geolocationSource = useSelector((state: RootState) => state.auth.geolocationSource);
  const signedIn = useSelector((state: RootState) => !!state.auth.user);
  const wizardIssues = useSelector((state: RootState) => state.repairWorkflow.issues);

  const mapRef = useRef<any>(null); // Add ref for the map
  const markerRefs = useRef<{ [key: string]: any }>({});
  const listItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const searchIdRef = useRef(0);
  /** True while the app is moving the map itself, to keep the prompt down. */
  const isProgrammaticMove = useRef(false);
  const suppressTimer = useRef<number | undefined>(undefined);
  /** The Leaflet cluster group, needed to reveal a marker hidden in a cluster. */
  const clusterRef = useRef<any>(null);

  // On a phone the map came 1.6 screens down, below every filter and the
  // list, and narrower than the screen (PBI 13850). There it shows the list
  // or the map, the map first and full width, with the secondary filters
  // folded away; larger screens keep the list beside the map.
  const phone = useMediaQuery('(max-width: 639px)', false);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = Object.values(selectedFilters).filter(Boolean).length;
  const appliedFilterCount = activeFilterCount + (partnerTypes.length > 0 ? 1 : 0);
  // Hidden, the map has no size; shown again, Leaflet must measure it, and
  // its resize event then searches the area it really covers.
  useLayoutEffect(() => {
    if (mobileView === 'map') mapRef.current?.invalidateSize();
  }, [mobileView]);

  /**
   * Silence the "search here" prompt for the length of a move we started.
   *
   * A window rather than a single flag: zoomToShowLayer fires `moveend` once
   * per zoom step and again after spiderfying, so consuming the flag on the
   * first one let the rest raise the prompt as if the user had panned.
   */
  const suppressMovePrompt = useCallback(() => {
    isProgrammaticMove.current = true;
    window.clearTimeout(suppressTimer.current);
    suppressTimer.current = window.setTimeout(() => {
      isProgrammaticMove.current = false;
    }, 900);
  }, []);
  // Read by the marker event handlers, which must stay referentially stable:
  // depending on `repairers` directly would rebuild every pin on each page
  // change and bring the flicker back.
  const repairersRef = useRef<Repairer[]>(repairers);
  repairersRef.current = repairers;
  /** Reported ids, shared with popups so a reopen still shows the confirmation. */
  const reportedIdsRef = useRef<Set<string>>(new Set());
  /** The pin currently drawn highlighted, so it can be reset when it changes. */
  const previousHighlightRef = useRef<string | null>(null);

  // Strip ?q from URL after consuming it so a refresh uses local state, not the stale param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('q')) {
      params.delete('q');
      history.replace({ pathname: location.pathname, search: params.toString() ? `?${params}` : '' });
    }
  }, []);

  // Reverse geocode lat/lon to a human-readable city label
  useEffect(() => {
    if (userLatitude == null || userLongitude == null) {
      setLocationLabel(null);
      return;
    }
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userLatitude}&lon=${userLongitude}&format=json`)
      .then((r) => r.json())
      .then((data) => {
        const addr = data.address ?? {};
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const country = addr.country || '';
        setLocationLabel(city ? `${city}, ${country}` : `${userLatitude.toFixed(2)}, ${userLongitude.toFixed(2)}`);
      })
      .catch(() => setLocationLabel(`${userLatitude.toFixed(2)}, ${userLongitude.toFixed(2)}`));
  }, [userLatitude, userLongitude]);

  const sourceLabels: Record<string, string> = { browser: 'GPS', ip: t('repairMap.ipAddress'), profile: t('repairMap.profileAddress'), manual: t('repairMap.enteredAddress'), map: t('repairMap.mapSearch') };
  const sourceLabel = geolocationSource ? sourceLabels[geolocationSource] : null;

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      dispatch(setGeolocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, source: 'browser' }));
      setShowAddressInput(false);
    });
  };

  const applyPickedLocation = (picked: PickedLocation) => {
    dispatch(setGeolocation({ latitude: picked.latitude, longitude: picked.longitude, source: 'manual' }));
    setShowAddressInput(false);
  };

  useEffect(() => {
    repairerService.getFilters().then((e) => {
      setFilters(e);
    });
  }, []);

  useEffect(() => {
    console.log("device, filters", device, filters);
    if (device) {
      if (device.categories && device.categories.length > 0) {
        // canonicalName, not name: name is translated, and "Réfrigérateur /
        // Combiné…" never matched "Fridge_combi_freezer" — the filter stayed
        // on "all types" in every language but English, and there too for any
        // category with a slash or a space.
        const wanted = device.categories.map((c) => repairerDeviceTypeFor(c.canonicalName ?? c.name));
        const filter = filters.find(
          (f) =>
            f.category.toLowerCase() === "device_type" &&
            wanted.includes(normalizeRepairerDeviceTypeKey(f.name))
        );
        if (filter) {
          setSelectedFilters((f) => ({ ...f, device_type: filter.name }));
          return;
        }
      }
      if (device.device_type && device.device_type !== "") {
        const filter = filters.find(
          (f) => f.name.toLowerCase() === device.device_type.toLowerCase()
        );
        if (filter) {
          setSelectedFilters((f) => ({ ...f, device_type: filter.name }));
        }
      }
    }
  }, [device, filters]);

  // The list shows the same repairers as the pins, so it carries the same
  // bounds. It stays paginated: the map can hold hundreds of pins, a readable
  // list cannot. Distance sorting still orders it when a position is known.
  const triggerSearch = useCallback(() => {
    setIsLoading(true);
    const searchId = ++searchIdRef.current;

    repairerService
      .listPaginated({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
        country: selectedFilters.country || undefined,
        device_type: selectedFilters.device_type || undefined,
        partner_type: partnerTypes.length ? partnerTypes.join(',') : undefined,
        latitude: useLocationSort ? (userLatitude ?? undefined) : undefined,
        longitude: useLocationSort ? (userLongitude ?? undefined) : undefined,
        north: debouncedBounds?.north,
        south: debouncedBounds?.south,
        east: debouncedBounds?.east,
        west: debouncedBounds?.west,
      })
      .then((response) => {
        if (searchId !== searchIdRef.current) return;
        setRepairers(response.data);
        setTotalRepairers(response.meta.total);
        setTotalPages(response.meta.totalPages);
        setIsLoading(false);
      })
      .catch(() => {
        if (searchId !== searchIdRef.current) return;
        setIsLoading(false);
      });
  }, [currentPage, itemsPerPage, debouncedSearch, selectedFilters, partnerTypes, useLocationSort, userLatitude, userLongitude, debouncedBounds]);

  useEffect(() => {
    triggerSearch();
  }, [triggerSearch]);

  // Pins for everything inside the visible rectangle, capped server-side.
  useEffect(() => {
    if (!debouncedBounds) return;
    let cancelled = false;

    repairerService
      .getMarkers({
        ...debouncedBounds,
        search: debouncedSearch || undefined,
        country: selectedFilters.country || undefined,
        device_type: selectedFilters.device_type || undefined,
        partner_type: partnerTypes.length ? partnerTypes.join(',') : undefined,
      })
      .then((response) => {
        if (cancelled) return;
        setMarkers(response.markers);
        setMarkersTotal(response.total);
        setMarkersTruncated(response.truncated);
      })
      .catch(() => {
        // Leaving the previous pins in place would draw them over a region
        // they no longer belong to, which reads as real data.
        if (!cancelled) {
          setMarkers([]);
          setMarkersTotal(0);
          setMarkersTruncated(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedBounds, debouncedSearch, selectedFilters, partnerTypes]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedFilters, partnerTypes]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const value = partnerTypes.join(',');
    if ((params.get('type') ?? '') === value) return;
    if (value) params.set('type', value);
    else params.delete('type');
    history.replace({ pathname: location.pathname, search: params.toString() ? `?${params}` : '' });
  }, [partnerTypes]);

  const togglePartnerType = (type: PartnerCategory) =>
    setPartnerTypes((current) =>
      PARTNER_CATEGORIES.filter((c) => (c === type ? !current.includes(c) : current.includes(c))),
    );

  const handleFilterChange = (category: string, value: string) => {
    setSelectedFilters((prev) => ({ ...prev, [category]: value }));
  };

  const resetFilters = () => {
    setSelectedFilters({});
    setPartnerTypes([]);
    setSearch("");
    dispatch(clearGlobalDevice());
    dispatch(setIssues([]));
  };

  const filterCategories = [
    ...new Set(filters.map((filter) => filter.category)),
  ];

  function handleSearch(): void {
    triggerSearch();
  }

  /**
   * Picking a repairer in the list: reveal its pin and open its card.
   *
   * A clustered marker is not on the map — the cluster group holds it aside —
   * so calling openPopup() on it does nothing at all, silently. That is what
   * made a list click appear to do nothing until you had zoomed in far enough
   * to break the cluster apart yourself.
   *
   * zoomToShowLayer() is the plugin's answer: it zooms, and spiderfies if the
   * pins share a spot, then calls back once the marker is really on the map.
   * It moves the view itself, so there is no flyTo here — the two would fight.
   */
  // A phone shows the list or the map, not both: a repairer picked in the
  // list is shown on the map, once the map has been laid out again.
  const pickFromList = (repairer: Repairer) => {
    if (phone && mobileView === 'list') {
      setMobileView('map');
      requestAnimationFrame(() => handleRepairerClick(repairer));
      return;
    }
    handleRepairerClick(repairer);
  };

  const handleRepairerClick = (repairer: Repairer) => {
    setSelectedRepairer(repairer);
    suppressMovePrompt();

    const marker = markerRefs.current[repairer.repairer_id];
    const group = clusterRef.current;

    // `__parent` is the cluster a marker belongs to, and `_icon` means it is
    // drawn on its own. zoomToShowLayer dereferences the first when the second
    // is absent, so without one of them present it throws rather than misses.
    const clusterKnowsIt = marker && (marker.__parent || marker._icon);

    if (group?.hasLayer?.(marker) && clusterKnowsIt) {
      group.zoomToShowLayer(marker, () => marker.openPopup());
      return;
    }

    // No marker for it: the row belongs to a page whose pins are no longer
    // loaded. Fly there so the click still leads somewhere.
    mapRef.current?.flyTo([repairer.latitude, repairer.longitude]);
    marker?.openPopup();
  };

  /**
   * Loads the card behind a pin, once, when it is opened.
   *
   * A marker carries an id and a position and nothing else — that leanness is
   * what lets the map show every repairer in view. The rest is fetched only
   * for the one the user actually asked about.
   */

  const handleReportRepairer = async (repairerId: string) => {
    if (reportingRepairerId || reportedRepairerIds.has(repairerId)) return;
    setReportingRepairerId(repairerId);
    try {
      await repairerService.reportRepairer(repairerId);
      reportedIdsRef.current.add(repairerId);
      setReportedRepairerIds((prev) => new Set(prev).add(repairerId));
    } catch (error) {
      console.error('Error reporting repairer', error);
    } finally {
      setReportingRepairerId(null);
    }
  };

  /**
   * Search the area now on screen.
   *
   * Applies the pending rectangle to both the pins and the list, and moves the
   * distance sort's origin to the map centre. That second half is the reason
   * this is a button and not an automatic refresh: results for Aachen ranked
   * by their distance from Lyon would be worse than not sorting at all.
   */
  const handleSearchHere = () => {
    if (!pendingView) return;
    dispatch(setGeolocation({
      latitude: pendingView.center.lat,
      longitude: pendingView.center.lng,
      source: 'map',
    }));
    setUseLocationSort(true);
    setBounds(pendingView.bounds);
    setCurrentPage(1);
    setShowSearchHere(false);
  };

  // Stable across renders so the memoised markers never have to be rebuilt.
  // Keeps the list's own reported state in step with a report made from a pin.
  const reportRepairer = useCallback(async (repairerId: string) => {
    await repairerService.reportRepairer(repairerId);
    setReportedRepairerIds((prev) => new Set(prev).add(repairerId));
  }, []);

  /**
   * The markers, built only when the marker data itself changes.
   *
   * Nothing here may depend on hover or selection. Those change on every
   * mouse move across the list, and a new children array makes
   * MarkerClusterGroup tear down and re-cluster every pin — which is what made
   * the map flicker. The highlight is applied imperatively instead, below.
   */
  const markerElements = useMemo(
    () =>
      markers.map((marker) => (
        <Marker
          key={marker.id}
          ref={(el) => { markerRefs.current[marker.id] = el; }}
          position={[marker.lat, marker.lng]}
          icon={customIcon}
          eventHandlers={{
            click: () => {
              // Leaflet opens this marker's popup on its own, and the pin is
              // by definition already visible — so only the selection is
              // recorded here. Routing through handleRepairerClick would
              // re-run zoomToShowLayer and move the map under the reader.
              const listed = repairersRef.current.find((r) => r.repairer_id === marker.id);
              if (listed) setSelectedRepairer(listed);
            },
            mouseover: () => {
              const listed = repairersRef.current.find((r) => r.repairer_id === marker.id);
              if (!listed) return;
              setHoveredRepairer(listed);
              listItemRefs.current[marker.id]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
              });
            },
            mouseout: () => setHoveredRepairer(null),
          }}
        >
          <Popup>
            <RepairerPopupBody
              id={marker.id}
              reportedIds={reportedIdsRef}
              onReport={reportRepairer}
            />
          </Popup>
        </Marker>
      )),
    // eslint-disable-next-line
    [markers],
  );

  // Highlight the hovered or selected pin by swapping its icon on the Leaflet
  // object directly, leaving the React tree — and so the cluster group —
  // untouched. Only the two pins involved are touched, not all 500.
  const highlightedId = selectedRepairer?.repairer_id ?? hoveredRepairer?.repairer_id ?? null;
  useEffect(() => {
    const previous = previousHighlightRef.current;
    if (previous && previous !== highlightedId) {
      markerRefs.current[previous]?.setIcon?.(customIcon);
    }
    if (highlightedId) {
      markerRefs.current[highlightedId]?.setIcon?.(highlightedIcon);
    }
    previousHighlightRef.current = highlightedId;
  }, [highlightedId]);

  const handleRecenter = () => {
    if (!mapRef.current || userLatitude == null || userLongitude == null) return;
    suppressMovePrompt();
    mapRef.current.flyTo([userLatitude, userLongitude], 12);
  };

  // Opening the popup is handled where the selection is made: from the list by
  // handleRepairerClick, which has to un-cluster the pin first, and from the
  // map by Leaflet itself. An effect here would fire a second time on the
  // marker path and re-open a popup the user may have just closed.

  /**
   * Re-centre the map when the location changes (address, GPS, IP).
   *
   * The searched rectangle has to move with it. It is what filters the list and
   * the pins, and a move we make ourselves never updates it: setting the
   * location to Aachen left the map over Germany and the results over Reims,
   * with no "search here" prompt to correct it since the prompt is suppressed
   * for our own moves. Read on `moveend` rather than straight after setView —
   * a zoom animation only publishes the new view when it ends.
   *
   * "Search here" is excluded: the map is already where the user put it and it
   * has already set the rectangle it asked for, which recentring at zoom 12
   * would replace with a narrower one.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || userLatitude == null || userLongitude == null) return;
    if (geolocationSource === 'map') return;

    suppressMovePrompt();
    map.once('moveend', () => {
      setBounds(readBounds(map));
      // The results are about somewhere else now; page 3 of the old area does
      // not carry over, and an offer to search it does not either.
      setCurrentPage(1);
      setPendingView(null);
      setShowSearchHere(false);
    });
    map.setView([userLatitude, userLongitude], 12);
  }, [userLatitude, userLongitude, geolocationSource, suppressMovePrompt]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const isLocationSortActive = useLocationSort && userLatitude != null && userLongitude != null;
  // The list is always paginated now. It used to fetch 200 rows in one go when
  // sorting by distance, purely so the map had enough pins to draw; the markers
  // endpoint covers that, so the list can go back to being a list.
  const shouldShowPagination = totalPages > 1;
  const endIndex = Math.min(startIndex + repairers.length, totalRepairers);


  function onPageChange(p: number) {
    setCurrentPage(p);
  }

  function handleItemsPerPageChange(value: number) {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  }

  return (
    <>
      <style>
        {`
          .leaflet-popup-content a:not(.repairer-details-link) {
            color: #121317 !important;
          }

          html.dark .leaflet-popup-content a:not(.repairer-details-link) {
            color: #121317 !important;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          /* Repairer list and map stack on narrow screens; side by side from lg.
             Fixed pixel heights below replace Tailwind arbitrary-value classes,
             which this project's Tailwind v2 (no JIT) does not compile. */
          .repair-map-list-scroll { height: 320px; }
          .repair-map-pane { height: 380px; }
          /* A phone shows one at a time: the list scrolls with the page, and
             the map takes the height left under the list / map switch. */
          @media (max-width: 639px) {
            .repair-map-list-scroll { height: auto; }
            .repair-map-pane { height: calc(100vh - 180px); height: calc(100dvh - 180px); min-height: 360px; }
          }
          @media (min-width: 1024px) {
            .repair-map-list-scroll { height: calc(700px - 100px); }
            /* auto, not 100%: the row that holds the list and the map has no
               height of its own, so a percentage here resolves against nothing
               and the map, its wrapper and MapContainer all being 100% of each
               other, the whole column collapsed to zero. Left to auto the pane
               is stretched to the row by align-items, which is a definite
               height the inner 100% can resolve against. */
            .repair-map-pane { height: auto; }
          }

          .leaflet-popup-content { min-width: 260px; }
          @media (min-width: 480px) {
            .leaflet-popup-content { min-width: 300px; }
          }

          /* Cluster bubbles — see clusterIcon() for the size ramp.

             A solid disc with a white ring rather than the plugin's disc inside
             a translucent halo: over busy tiles that halo blurs the edge and
             several bubbles near each other read as one smudge. The ring is
             what separates a bubble from the map, and from its neighbours.

             Deliberately not the same shape as a pin. Pins are teardrops that
             point at an address; a cluster points at nothing in particular, so
             it is a disc centred on the group. */
          .c2r-cluster {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 9999px;
            background-color: #7c3aed;
            color: #ffffff;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            letter-spacing: -0.02em;
            border: 2px solid rgba(255, 255, 255, 0.95);
            box-shadow: 0 2px 6px rgba(24, 12, 48, 0.35);
            transition: transform 120ms ease-out, background-color 120ms ease-out;
          }
          .c2r-cluster:hover {
            transform: scale(1.08);
            background-color: #6d28d9;
          }
          .c2r-cluster span { line-height: 1; }

          /* Type scale follows the disc, so the digits keep the same optical
             weight whether the bubble is 32px or 58px across. */
          .c2r-cluster-sm { font-size: 12px; }
          .c2r-cluster-md { font-size: 13px; }
          .c2r-cluster-lg { font-size: 15px; }
          .c2r-cluster-xl { font-size: 17px; }

          /* Dark theme: a brighter fill so the disc lifts off the darkened
             tiles, and the ring inverted — a white ring there glows and eats
             the digits. White text is kept at both themes so a bubble never
             changes meaning, only brightness. */
          html.dark .c2r-cluster {
            /* Brighter than the light theme so the disc lifts off dark tiles,
               but no brighter: #8b5cf6 under white numerals measures 4.3:1,
               which the 12px count does not clear. This holds 4.5:1. */
            background-color: #8250f0;
            border-color: rgba(17, 24, 39, 0.85);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
          }
          html.dark .c2r-cluster:hover {
            background-color: #a78bfa;
          }
        `}
      </style>
      {/* Combined Header and Search Section */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mt-4 mb-4 sm:mb-8">
        {/* Contextual banner from wizard, only while repairers are shown: over
            second-hand places nobody is looking for a repairer. */}
        {(wizardIssues.length > 0 || device) && (partnerTypes.length === 0 || partnerTypes.includes('repairer')) && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-customgreen-50 dark:bg-customgreen-900/20 border border-customgreen-200 dark:border-customgreen-700 rounded-xl text-sm text-customgreen-800 dark:text-customgreen-200">
            <span className="material-symbols-outlined text-base text-customgreen-600 dark:text-customgreen-400">info</span>
            <span>
              {t('repairMap.lookingForRepairer')}
              {wizardIssues.length > 0 && (
                <span> {t('repairMap.for')}{" "}
                  <span className="font-semibold">
                    {wizardIssues.map((k) => t(`wizard.issue.issues.${k}`, { defaultValue: getIssueLabel(k) })).join(", ")}
                  </span>
                </span>
              )}
              {device && (
                <span> {t('repairMap.on')}{" "}
                  <span className="font-semibold">{device.brand} {device.model}</span>
                </span>
              )}
            </span>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center">
            <span className="material-symbols-outlined text-3xl text-purple-600 dark:text-purple-400 mr-3">map</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {t('repairMap.title')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('repairMap.placesCount', { count: totalRepairers })}
              </p>
            </div>
          </div>
          {signedIn && (
            <Button
              component={Link}
              to="/app/repairers/new"
              variant="outline"
              size="xs"
              leftSection={<span className="material-symbols-outlined text-base">add_location_alt</span>}
            >
              {t('repairMap.proposeRepairer')}
            </Button>
          )}
          {/* <div className="hidden lg:block">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-purple-600 dark:text-purple-400">location_searching</span>
            </div>
          </div> */}
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-4">
          {/* The kinds of place: out of the folded filters, as the first choice
              and the one the wizard presets. */}
          <div role="group" aria-label={t('repairMap.partnerFilter.label')} className="flex flex-wrap items-center gap-2">
            {/* On a phone the chips need the line; the group keeps its name. */}
            <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300 mr-1">
              {t('repairMap.partnerFilter.label')}
            </span>
            {[
              { key: 'all', label: t('repairMap.partnerFilter.all'), icon: null, pressed: partnerTypes.length === 0, onClick: () => setPartnerTypes([]) },
              ...PARTNER_CATEGORIES.map((type) => ({
                key: type,
                label: t(`repairMap.partnerFilter.${type}`),
                icon: PARTNER_CATEGORY_ICON[type],
                pressed: partnerTypes.includes(type),
                onClick: () => togglePartnerType(type),
              })),
            ].map((chip) => (
              <button
                key={chip.key}
                type="button"
                aria-pressed={chip.pressed}
                onClick={chip.onClick}
                className={`flex items-center gap-1 h-8 px-2.5 sm:px-3 rounded-full border text-xs sm:text-sm font-medium transition-colors ${
                  chip.pressed
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-purple-500'
                }`}
              >
                {chip.pressed ? (
                  <span aria-hidden="true" className="material-symbols-outlined text-base">check</span>
                ) : chip.icon ? (
                  <span aria-hidden="true" className="material-symbols-outlined text-base">{chip.icon}</span>
                ) : null}
                {chip.label}
              </button>
            ))}
          </div>

          {/* Row 1: Search + Filter selects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="material-symbols-outlined text-sm mr-1">search</span>
                {t('repairMap.searchByName')}
              </label>
              <Input
                type="text"
                placeholder={t('repairMap.enterName')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Filter selects, folded away on a phone until asked for */}
            {(!phone || filtersOpen) && (<>
            {filterCategories.map((category) => (
              <div key={category}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="material-symbols-outlined text-sm mr-1">filter_list</span>
                  {t(`repairMap.categories.${category}`, { defaultValue: category })}
                </label>
                <Select
                  value={selectedFilters[category] || ""}
                  onChange={(e) => handleFilterChange(category, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">{t('repairMap.allCategory', { category: t(`repairMap.categories.${category}`, { defaultValue: category }) })}</option>
                  {category.toLowerCase() === 'device_type'
                    ? DEVICE_TYPE_GROUPS.map((group) => {
                        const groupOptions = filters
                          .filter(
                            (filter) =>
                              filter.category.toLowerCase() === 'device_type' &&
                              getDeviceTypeGroup(filter.name) === group,
                          )
                          .map((filter) => ({
                            filter,
                            label: translateRepairerDeviceType(filter.name, t),
                          }))
                          .sort((a, b) => a.label.localeCompare(b.label));

                        if (groupOptions.length === 0) return null;

                        return (
                          <optgroup
                            key={group}
                            label={t(`repairMap.deviceGroups.${group}`, { defaultValue: group })}
                          >
                            {groupOptions.map(({ filter, label }) => (
                              <option key={filter.id} value={filter.name}>
                                {filter.count != null ? `${label} (${filter.count})` : label}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })
                    : filters
                        .filter(
                          (filter) =>
                            filter.category.toLowerCase() === category.toLowerCase()
                        )
                        .map((filter) => ({
                          filter,
                          label: filter.label || filter.name,
                        }))
                        .sort((a, b) => a.label.localeCompare(b.label))
                        .map(({ filter, label }) => (
                          <option key={filter.id} value={filter.name}>
                            {label}
                          </option>
                        ))}
                </Select>
              </div>
            ))}

            </>)}
          </div>

          {/* Row 2: Location filter */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="material-symbols-outlined text-sm mr-1">my_location</span>
                  {t('repairMap.location')}
              </label>
              <div className={`w-full px-3 py-2 border rounded-lg text-sm flex flex-col gap-1.5 ${
                useLocationSort && userLatitude
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-400 dark:border-purple-600'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    {useLocationSort && userLatitude && userLongitude ? (
                      <>
                        {locationLabel
                          ? <span className="font-semibold">{locationLabel}</span>
                          : t('repairMap.sortingByDistance')
                        }
                        {sourceLabel && <span className="text-gray-400 dark:text-gray-500"> · {sourceLabel}</span>}
                      </>
                    ) : userLatitude && userLongitude ? (
                      <span className="text-gray-500 dark:text-gray-400">{t('repairMap.sortingDisabled')}</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">{t('repairMap.noLocation')}</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onClick={detectLocation} title={t('repairMap.gps')}
                      className="p-2 -m-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors">
                      <span className="material-symbols-outlined text-sm">gps_fixed</span>
                    </button>
                    <button type="button" onClick={() => setShowAddressInput((v) => !v)} title={t('repairMap.enterAddress')}
                      className="p-2 -m-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors">
                      <span className="material-symbols-outlined text-sm">edit_location</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseLocationSort((v) => !v)}
                      disabled={!userLatitude || !userLongitude}
                      title={useLocationSort ? t('repairMap.disableDistanceSorting') : t('repairMap.enableDistanceSorting')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        useLocationSort && userLatitude ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        useLocationSort && userLatitude ? 'translate-x-4' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
                {showAddressInput && (
                  <LocationAutocomplete
                    onSelect={applyPickedLocation}
                    onCancel={() => setShowAddressInput(false)}
                    near={userLatitude != null && userLongitude != null ? { latitude: userLatitude, longitude: userLongitude } : null}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-2">
            {phone ? (
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                className="self-start flex items-center gap-1 text-sm font-semibold text-purple-700 dark:text-purple-300"
              >
                <span className="material-symbols-outlined text-base">tune</span>
                {t('repairMap.filters')}
                {activeFilterCount > 0 && (
                  <span className="ml-1 px-2 rounded-full bg-purple-600 text-white text-xs">{activeFilterCount}</span>
                )}
                <span className="material-symbols-outlined text-base">{filtersOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
            ) : (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span className="material-symbols-outlined text-sm mr-1">info</span>
              {appliedFilterCount > 0 ? (
                <span>{t('repairMap.filtersApplied', { count: appliedFilterCount })}</span>
              ) : (
                <span>{t('repairMap.noFiltersApplied')}</span>
              )}
            </div>
            )}
            {/* Full width on a phone: side by side they ran past the card. */}
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                loading={isLoading}
                onClick={handleSearch}
                disabled={isLoading}
                className="flex-1 sm:flex-none flex items-center px-4 py-2 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors duration-200"
              >
                <span className="material-symbols-outlined mr-2 text-sm">search</span>
                {isLoading ? t('repairMap.searching') : t('repairMap.search')}
              </Button>
              <Button
                color="transparent"
                onClick={resetFilters}
                disabled={isLoading}
                className="flex-1 sm:flex-none flex items-center px-4 py-2 border border-red-500 text-red-600 dark:text-red-400 font-semibold rounded-lg hover:bg-gray-500 dark:hover:bg-red-900/20 transition-colors duration-200"
              >
                <span className="material-symbols-outlined mr-2 text-sm">refresh</span>
                {t('repairMap.reset')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* List / map switch, held at the top while the list scrolls. Above
          the map's own buttons, which sit at z-index 1000. */}
      {phone && (
        <div className="sticky top-0 -mx-6 px-6 py-2 bg-gray-50 dark:bg-gray-900" style={{ zIndex: 1100 }}>
          <SegmentedControl
            fullWidth
            radius="xl"
            color="violet"
            value={mobileView}
            onChange={(value) => setMobileView(value as 'map' | 'list')}
            data={[
              { value: 'map', label: t('repairMap.viewMap') },
              { value: 'list', label: `${t('repairMap.viewList')} (${totalRepairers})` },
            ]}
          />
        </div>
      )}

      {/* Map and List Section */}
      <div className={phone
        ? 'flex flex-col mb-4'
        : 'flex flex-col lg:flex-row bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8'}>
        {/* Repairers List */}
        <div className={`w-full lg:w-1/3 lg:pr-4 flex flex-col justify-between ${phone && mobileView === 'map' ? 'hidden' : ''}`}>
          <div>
            <h2 className="hidden sm:block text-xl font-semibold text-gray-800 dark:text-white mb-4">{t('repairMap.places')}</h2>
            <div className="overflow-y-auto repair-map-list-scroll">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg mb-2 border border-gray-200 dark:border-gray-700 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              ))
            ) : (
              repairers.map((repairer) => (
                <div
                  ref={(el) => { listItemRefs.current[repairer.repairer_id] = el; }}
                  key={repairer.repairer_id}
                  onClick={() => pickFromList(repairer)}
                  onMouseEnter={() => setHoveredRepairer(repairer)}
                  onMouseLeave={() => setHoveredRepairer(null)}
                  className={`p-4 rounded-lg mb-2 cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-200 border ${
                    selectedRepairer?.repairer_id === repairer.repairer_id ? 'border-purple-500 border-2' : 'border-gray-200 dark:border-gray-700'
                  } ${
                    hoveredRepairer?.repairer_id === repairer.repairer_id ? 'bg-purple-100 dark:bg-purple-900' : ''
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {repairer.name}
                      {repairer.is_demo && <span className="ml-2 align-middle"><DemoBadge size="xs" /></span>}
                    </h3>
                    <button
                      type="button"
                      title={t('repairMap.reportIrrelevant.button')}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReportRepairer(repairer.repairer_id);
                      }}
                      disabled={reportingRepairerId === repairer.repairer_id || reportedRepairerIds.has(repairer.repairer_id)}
                      className="flex-shrink-0 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">
                        {reportedRepairerIds.has(repairer.repairer_id) ? 'flag' : 'outlined_flag'}
                      </span>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{repairer.address}</p>
                  {repairer.repairerDevices && repairer.repairerDevices.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {t('repairMap.specialist.label')}:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {repairer.repairerDevices.slice(0, 3).map((device, index) => (
                          <span
                            key={`${repairer.repairer_id}_list_${device.repairer_device_id}_${index}`}
                            className="inline-block px-2 py-0.5 bg-purple-100 dark:bg-purple-100 text-gray-700 text-xs rounded-full"
                          >
                            {translateRepairerDeviceType(device.device_type, t)}
                          </span>
                        ))}
                        {repairer.repairerDevices.length > 3 && (
                          <span className="inline-block px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                            {t('repairMap.moreDevices', { count: repairer.repairerDevices.length - 3 })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {reportedRepairerIds.has(repairer.repairer_id) && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {t('repairMap.reportIrrelevant.confirmation')}
                    </p>
                  )}
                </div>
              ))
            )}
            </div>
          </div>
          {shouldShowPagination && (
          <div className="py-4">
            <div className="flex flex-col gap-3">
              {!isLocationSortActive && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">{t('repairMap.itemsPerPage')}</label>
                <Select
                  value={itemsPerPage.toString()}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              )}
              <div className="flex justify-between items-center flex-col">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isLoading ? t('repairMap.loading') : t('repairMap.pagination', { from: startIndex + 1, to: endIndex, total: totalRepairers })}
                </p>
                <Pagination
                  total={totalPages}
                  onChange={onPageChange}
                  value={currentPage}
                  mt="sm"
                  color="customPurple"
                />
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Map Section */}
        <div className={`relative lg:w-2/3 lg:mt-0 repair-map-pane ${phone ? `-mx-6 ${mobileView === 'list' ? 'hidden' : ''}` : 'w-full mt-6'}`}>
          <div
            className="sm:rounded-lg overflow-hidden transition-all duration-300"
            style={{ filter: isLoading ? 'blur(3px)' : 'none', opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? 'none' : 'auto', height: '100%' }}
          >
          <MapContainer
            center={userLatitude && userLongitude ? [userLatitude, userLongitude] : [48.8566, 2.3522]}
            zoom={userLatitude && userLongitude ? 12 : 6}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
            className="z-0 sm:rounded-lg"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution={`&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | ${t('repairMap.ademeAttribution')} <a href="${ADEME_DATASET.url}">${ADEME_DATASET.name.replace('&', '&amp;')}</a>, ${ADEME_DATASET.licence}`}
            />
            {userLatitude && userLongitude && (
              <Marker position={[userLatitude, userLongitude]} icon={userLocationIcon}>
                <Popup>{t('repairMap.yourLocation')}</Popup>
              </Marker>
            )}
            <MarkerClusterGroup
              // Cluster only what actually overlaps, and stop clustering early
              // enough that a street-level view shows individual shops.
              ref={clusterRef}
              iconCreateFunction={clusterIcon}
              maxClusterRadius={50}
              disableClusteringAtZoom={16}
              spiderfyOnMaxZoom
              showCoverageOnHover={false}
              chunkedLoading
            >
            {markerElements}
            </MarkerClusterGroup>
            <MapMoveHandler
              isProgrammatic={isProgrammaticMove}
              onMoved={(view) => {
                setPendingView(view);
                setShowSearchHere(true);
              }}
              onSettled={setBounds}
              onPopupOpenChange={setIsPopupOpen}
            />
          </MapContainer>
          </div>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="24" cy="24" r="20" stroke="#e9d5ff" strokeWidth="4" />
                <path d="M44 24a20 20 0 0 0-20-20" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
          )}
          {/* Moving the map offers a new area; this is what accepts it. Kept a
              deliberate act rather than an automatic refresh because it also
              moves the distance sort's origin to the map centre. */}
          {showSearchHere && !isLoading && !isPopupOpen && (
            <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 1000 }}>
              <button
                onClick={handleSearchHere}
                className="pointer-events-auto px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-semibold rounded-full shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">search</span>
                {t('repairMap.searchHere')}
              </button>
            </div>
          )}
          {/* Only shown when the server capped the answer. Saying how many are
              really in view keeps the cap from reading as the total. The
              "search here" prompt takes the same spot, so they never stack. */}
          {markersTruncated && !showSearchHere && !isPopupOpen && (
            <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none px-4" style={{ zIndex: 1000 }}>
              <div className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 text-sm flex items-center gap-2 text-center">
                <span className="material-symbols-outlined text-sm">zoom_in</span>
                <span>
                  {t('repairMap.markersInArea', { count: markersTotal, shown: markers.length })}
                  {' '}
                  {t('repairMap.zoomForDetail')}
                </span>
              </div>
            </div>
          )}
          {!isLoading && userLatitude != null && userLongitude != null && (
            <div className="absolute bottom-6 right-3 pointer-events-none" style={{ zIndex: 1000 }}>
              <button
                onClick={handleRecenter}
                title={t('repairMap.recenter')}
                className="pointer-events-auto w-11 h-11 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">my_location</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RepairMapPage;

