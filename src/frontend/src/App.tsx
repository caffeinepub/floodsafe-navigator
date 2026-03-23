import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Clock,
  Droplets,
  Loader2,
  MapIcon,
  MapPin,
  Navigation,
  Radio,
  Ruler,
  Search,
  Shield,
  Wind,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// --- Types ---
type FloodLevel = "high" | "moderate" | "safe";

interface RoadSegment {
  id: string;
  name: string;
  coords: [number, number][];
  level: FloodLevel;
}

interface Location {
  id: string;
  name: string;
  coords: [number, number];
}

interface RouteResult {
  from: Location;
  to: Location;
  segments: RoadSegment[];
  timeMin: number;
  distanceKm: number;
  safetyScore: number;
  warning?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

interface SelectedLocation {
  name: string;
  coords: [number, number];
}

interface WeatherData {
  temp: number;
  windspeed: number;
  weathercode: number;
  humidity: number;
}

// --- Data ---
const INDIA_LOCATIONS: Location[] = [
  { id: "delhi", name: "New Delhi", coords: [28.6139, 77.209] },
  { id: "mumbai", name: "Mumbai", coords: [19.076, 72.8777] },
  { id: "bangalore", name: "Bengaluru", coords: [12.9716, 77.5946] },
  { id: "chennai", name: "Chennai", coords: [13.0827, 80.2707] },
  { id: "kolkata", name: "Kolkata", coords: [22.5726, 88.3639] },
  { id: "hyderabad", name: "Hyderabad", coords: [17.385, 78.4867] },
];

const ROAD_SEGMENTS: RoadSegment[] = [
  {
    id: "seg-1",
    name: "NH-48 Delhi-Gurugram",
    coords: [
      [28.635, 77.22],
      [28.6, 77.13],
      [28.475, 77.02],
    ],
    level: "high",
  },
  {
    id: "seg-2",
    name: "Ring Road Delhi",
    coords: [
      [28.644, 77.185],
      [28.66, 77.23],
      [28.678, 77.26],
    ],
    level: "moderate",
  },
  {
    id: "seg-3",
    name: "Yamuna Expressway",
    coords: [
      [28.48, 77.49],
      [27.98, 77.58],
      [27.49, 77.67],
    ],
    level: "safe",
  },
  {
    id: "seg-4",
    name: "Marine Drive Mumbai",
    coords: [
      [18.943, 72.823],
      [18.966, 72.816],
      [18.984, 72.811],
    ],
    level: "high",
  },
  {
    id: "seg-5",
    name: "Western Express Highway",
    coords: [
      [19.07, 72.835],
      [19.15, 72.844],
      [19.22, 72.858],
    ],
    level: "moderate",
  },
  {
    id: "seg-6",
    name: "NH-44 Bangalore-Chennai",
    coords: [
      [12.97, 77.59],
      [12.6, 78.2],
      [13.08, 80.27],
    ],
    level: "safe",
  },
  {
    id: "seg-7",
    name: "Kolkata Circular Road",
    coords: [
      [22.57, 88.36],
      [22.59, 88.38],
      [22.61, 88.4],
    ],
    level: "high",
  },
  {
    id: "seg-8",
    name: "Anna Salai Chennai",
    coords: [
      [13.06, 80.27],
      [13.075, 80.258],
      [13.085, 80.248],
    ],
    level: "moderate",
  },
  {
    id: "seg-9",
    name: "Linking Road Mumbai",
    coords: [
      [19.068, 72.836],
      [19.075, 72.829],
      [19.082, 72.822],
    ],
    level: "safe",
  },
  {
    id: "seg-10",
    name: "NH-8 Jaipur Highway",
    coords: [
      [28.6, 77.1],
      [27.5, 76.6],
      [26.91, 75.79],
    ],
    level: "moderate",
  },
];

const FLOOD_COLORS: Record<FloodLevel, string> = {
  high: "#C62828",
  moderate: "#F2C94C",
  safe: "#2EAD4A",
};

const FLOOD_WEIGHTS: Record<FloodLevel, number> = {
  high: 6,
  moderate: 5,
  safe: 4,
};

const HIGH_RISK_ZONES: { coords: [number, number]; label: string }[] = [
  { coords: [28.635, 77.22], label: "NH-48 Delhi-Gurugram — Severe Flooding" },
  { coords: [18.943, 72.823], label: "Marine Drive Mumbai — Road Submerged" },
  { coords: [22.57, 88.36], label: "Kolkata Circular Road — High Risk" },
];

const FLOW_STEPS = [
  { label: "Road Sensors", desc: "Water level (cm), GPS coords", icon: "🌊" },
  { label: "Cloud Gateway", desc: "MQTT / HTTP push, 60s interval", icon: "☁️" },
  { label: "Backend API", desc: "Stores & classifies flood data", icon: "🖥️" },
  { label: "Live Map", desc: "Color-coded roads & safe routes", icon: "🗺️" },
  { label: "User App", desc: "Navigate safely in real time", icon: "📱" },
];

const STATS = [
  { value: "247", label: "Active Sensors" },
  { value: "12", label: "Flood Zones" },
  { value: "60s", label: "Update Interval" },
  { value: "98.4%", label: "Uptime" },
];

const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: "Clear Sky", emoji: "☀️" },
  1: { label: "Mainly Clear", emoji: "🌤️" },
  2: { label: "Partly Cloudy", emoji: "⛅" },
  3: { label: "Overcast", emoji: "☁️" },
  45: { label: "Foggy", emoji: "🌫️" },
  48: { label: "Icy Fog", emoji: "🌫️" },
  51: { label: "Light Drizzle", emoji: "🌦️" },
  53: { label: "Drizzle", emoji: "🌦️" },
  55: { label: "Heavy Drizzle", emoji: "🌧️" },
  61: { label: "Slight Rain", emoji: "🌧️" },
  63: { label: "Moderate Rain", emoji: "🌧️" },
  65: { label: "Heavy Rain", emoji: "🌧️" },
  71: { label: "Light Snow", emoji: "🌨️" },
  73: { label: "Moderate Snow", emoji: "❄️" },
  75: { label: "Heavy Snow", emoji: "❄️" },
  77: { label: "Snow Grains", emoji: "🌨️" },
  80: { label: "Slight Showers", emoji: "🌦️" },
  81: { label: "Moderate Showers", emoji: "🌧️" },
  82: { label: "Violent Showers", emoji: "⛈️" },
  85: { label: "Snow Showers", emoji: "🌨️" },
  86: { label: "Heavy Snow Showers", emoji: "❄️" },
  95: { label: "Thunderstorm", emoji: "⛈️" },
  96: { label: "Heavy Thunderstorm", emoji: "🌩️" },
  99: { label: "Hail Thunderstorm", emoji: "🌩️" },
};

function getWeatherInfo(code: number): { label: string; emoji: string } {
  return WMO_CODES[code] ?? { label: "Unknown", emoji: "🌡️" };
}

function isRainyCode(code: number): boolean {
  return (code >= 51 && code <= 82) || (code >= 95 && code <= 99);
}

function computeRoute(
  from: SelectedLocation,
  to: SelectedLocation,
): RouteResult {
  const safeSegs = ROAD_SEGMENTS.filter((s) => s.level === "safe");
  const modSegs = ROAD_SEGMENTS.filter((s) => s.level === "moderate");
  const highSegs = ROAD_SEGMENTS.filter((s) => s.level === "high");

  const latDiff = Math.abs(from.coords[0] - to.coords[0]);
  const lngDiff = Math.abs(from.coords[1] - to.coords[1]);
  const distKm = Math.round((latDiff + lngDiff) * 111 * 10) / 10;
  const timeMin = Math.round(distKm * 2.5 + 5);

  let chosenSegs: RoadSegment[] = [];
  let safetyScore = 95;
  let warning: string | undefined;

  // Determine route based on latitude zones in India
  const isNorth = from.coords[0] > 25 || to.coords[0] > 25;
  const isSouth = from.coords[0] < 18 || to.coords[0] < 18;
  const isCoastal =
    from.coords[1] > 78 ||
    to.coords[1] > 78 ||
    from.coords[1] < 73 ||
    to.coords[1] < 73;

  if (isNorth && isCoastal) {
    chosenSegs = [ROAD_SEGMENTS[1], ROAD_SEGMENTS[4]];
    safetyScore = 75;
    warning =
      "Avoid NH-48 — severe flooding reported. Use Ring Road via bypass.";
  } else if (isSouth) {
    chosenSegs = [safeSegs[1] || safeSegs[0], modSegs[1] || modSegs[0]];
    safetyScore = 84;
    warning = "Anna Salai has minor waterlogging. Allow extra 8-10 minutes.";
  } else if (isCoastal) {
    chosenSegs = [ROAD_SEGMENTS[8], ROAD_SEGMENTS[4]];
    safetyScore = 68;
    warning = "Marine Drive fully flooded. Use Western Express Highway route.";
  } else {
    chosenSegs = [safeSegs[0], modSegs[0]];
    safetyScore = 90;
  }

  if (safetyScore < 70) {
    chosenSegs = [...chosenSegs, highSegs[0]];
  }

  return {
    from: { id: "from", name: from.name, coords: from.coords },
    to: { id: "to", name: to.name, coords: to.coords },
    segments: chosenSegs,
    timeMin,
    distanceKm: distKm,
    safetyScore,
    warning,
  };
}

// Fix leaflet default icon paths
(L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl =
  undefined;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// --- Location Search Input Component ---
function LocationSearchInput({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  ocidPrefix,
  extraAction,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (loc: SelectedLocation) => void;
  placeholder: string;
  ocidPrefix: string;
  extraAction?: React.ReactNode;
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      setNoResults(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsLoading(true);
    setNoResults(false);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`;
      const res = await fetch(url, {
        headers: { "User-Agent": "FloodSafeNavigator/1.0" },
        signal: abortRef.current.signal,
      });
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowDropdown(true);
      setNoResults(data.length === 0);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setSuggestions([]);
        setNoResults(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleInputChange(val: string) {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
  }

  function handleSelect(result: NominatimResult) {
    const shortName = result.display_name
      .split(",")
      .slice(0, 2)
      .join(",")
      .trim();
    onChange(shortName);
    onSelect({
      name: shortName,
      coords: [Number.parseFloat(result.lat), Number.parseFloat(result.lon)],
    });
    setSuggestions([]);
    setShowDropdown(false);
  }

  function handleBlur() {
    setTimeout(() => setShowDropdown(false), 180);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        {extraAction}
      </div>
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          {isLoading && (
            <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-muted-foreground animate-spin" />
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full h-9 pl-8 pr-8 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
            data-ocid={`${ocidPrefix}.input`}
          />
        </div>

        {showDropdown && (
          <div
            className="absolute z-[2000] mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden"
            data-ocid={`${ocidPrefix}.dropdown_menu`}
          >
            {noResults ? (
              <div className="px-3 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                No locations found in India
              </div>
            ) : (
              <ul>
                {suggestions.map((r, i) => {
                  const parts = r.display_name.split(",");
                  const main = parts.slice(0, 2).join(",").trim();
                  const sub = parts.slice(2, 4).join(",").trim();
                  return (
                    <li
                      key={r.place_id}
                      onMouseDown={() => handleSelect(r)}
                      className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors border-b border-border last:border-0"
                      data-ocid={`${ocidPrefix}.item.${i + 1}`}
                    >
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {main}
                        </p>
                        {sub && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {sub}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Weather Card Component ---
function WeatherCard({ weather }: { weather: WeatherData }) {
  const info = getWeatherInfo(weather.weathercode);
  const isRainy = isRainyCode(weather.weathercode);
  return (
    <div
      className="rounded-xl px-3 py-2.5 shadow-lg text-white"
      style={{ background: "rgba(15,79,90,0.93)", minWidth: "200px" }}
      data-ocid="weather.card"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xl">{info.emoji}</span>
        <div>
          <p className="text-xs font-bold">{info.label}</p>
          <p className="text-[10px] text-white/70">Current Weather</p>
        </div>
        <span className="ml-auto text-lg font-black">{weather.temp}°C</span>
      </div>
      <div className="flex gap-3 text-[10px] text-white/80">
        <span className="flex items-center gap-1">
          <Wind className="w-3 h-3" /> {weather.windspeed} km/h
        </span>
        <span className="flex items-center gap-1">
          <Droplets className="w-3 h-3" /> {weather.humidity}% humidity
        </span>
      </div>
      {isRainy && (
        <div className="mt-2 flex items-center gap-1.5 bg-red-700/60 rounded-md px-2 py-1">
          <AlertTriangle className="w-3 h-3 text-yellow-300" />
          <p className="text-[10px] text-yellow-200 font-semibold">
            Flood risk elevated — rain detected
          </p>
        </div>
      )}
    </div>
  );
}

// --- Main App ---
export default function App() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylineLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromLoc, setFromLoc] = useState<SelectedLocation | null>(null);
  const [toLoc, setToLoc] = useState<SelectedLocation | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastUpdate] = useState("Live — Updated 2 min ago");
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  // Fetch weather when fromLoc changes
  useEffect(() => {
    if (!fromLoc) return;
    const [lat, lon] = fromLoc.coords;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,windspeed_10m&timezone=Asia%2FKolkata&forecast_days=1`,
    )
      .then((r) => r.json())
      .then((data) => {
        const cw = data.current_weather;
        const humidity = data.hourly?.relativehumidity_2m?.[0] ?? 70;
        setWeatherData({
          temp: Math.round(cw.temperature),
          windspeed: Math.round(cw.windspeed),
          weathercode: cw.weathercode,
          humidity,
        });
      })
      .catch(() => {
        // silently fail weather fetch
      });
  }, [fromLoc]);

  function handleUseMyLocation() {
    if (!navigator.geolocation) return;
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { "User-Agent": "FloodSafeNavigator/1.0" } },
          );
          const data = await res.json();
          const name = data.display_name
            ? data.display_name.split(",").slice(0, 2).join(",").trim()
            : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          const loc: SelectedLocation = { name, coords: [lat, lon] };
          setFromLoc(loc);
          setFromText(name);
          if (mapRef.current) {
            (mapRef.current as any).setView([lat, lon], 13);
          }
        } catch {
          // use raw coords
          const name = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          const loc: SelectedLocation = { name, coords: [lat, lon] };
          setFromLoc(loc);
          setFromText(name);
          if (mapRef.current) {
            (mapRef.current as any).setView([lat, lon], 13);
          }
        } finally {
          setIsGeolocating(false);
        }
      },
      () => {
        setIsGeolocating(false);
      },
      { timeout: 10000 },
    );
  }

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    const polylineLayer = L.layerGroup().addTo(map);
    polylineLayerRef.current = polylineLayer;

    const routeLayer = L.layerGroup().addTo(map);
    routeLayerRef.current = routeLayer;

    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;

    for (const seg of ROAD_SEGMENTS) {
      const polyline = L.polyline(seg.coords, {
        color: FLOOD_COLORS[seg.level],
        weight: FLOOD_WEIGHTS[seg.level],
        opacity: 0.85,
      });
      polyline.bindTooltip(
        `<strong>${seg.name}</strong><br/>${seg.level.charAt(0).toUpperCase() + seg.level.slice(1)} Flood Risk`,
        { sticky: true },
      );
      polyline.addTo(polylineLayer);
    }

    const warningIcon = L.divIcon({
      html: `<div style="background:#C62828;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)">⚠</div>`,
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    for (const zone of HIGH_RISK_ZONES) {
      L.marker(zone.coords, { icon: warningIcon })
        .bindPopup(`<strong>⚠ High Flood Risk</strong><br/>${zone.label}`)
        .addTo(map);
    }

    const locIcon = L.divIcon({
      html: `<div style="background:#1F6F7E;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">📍</div>`,
      className: "",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    for (const loc of INDIA_LOCATIONS) {
      L.marker(loc.coords, { icon: locIcon }).bindTooltip(loc.name).addTo(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function handleFindRoute() {
    if (!fromLoc || !toLoc) return;
    setIsCalculating(true);
    setTimeout(() => {
      const computed = computeRoute(fromLoc, toLoc);
      setRoute(computed);
      setIsCalculating(false);

      if (routeLayerRef.current) {
        routeLayerRef.current.clearLayers();
        for (const seg of computed.segments) {
          L.polyline(seg.coords, {
            color: FLOOD_COLORS[seg.level],
            weight: 9,
            opacity: 1,
            dashArray: seg.level === "high" ? "8 6" : undefined,
          }).addTo(routeLayerRef.current);
        }
      }

      if (markerLayerRef.current) {
        markerLayerRef.current.clearLayers();
        const fromIcon = L.divIcon({
          html: `<div style="background:#2EAD4A;color:white;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-weight:bold">A</div>`,
          className: "",
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        const toIcon = L.divIcon({
          html: `<div style="background:#C62828;color:white;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-weight:bold">B</div>`,
          className: "",
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        L.marker(fromLoc.coords, { icon: fromIcon })
          .bindPopup(`<strong>From:</strong> ${fromLoc.name}`)
          .addTo(markerLayerRef.current);
        L.marker(toLoc.coords, { icon: toIcon })
          .bindPopup(`<strong>To:</strong> ${toLoc.name}`)
          .addTo(markerLayerRef.current);
      }

      if (mapRef.current) {
        const bounds = L.latLngBounds([fromLoc.coords, toLoc.coords]);
        mapRef.current.fitBounds(bounds, { padding: [80, 80] });
      }
    }, 900);
  }

  const safetyColor =
    route && route.safetyScore >= 85
      ? "text-green-600"
      : route && route.safetyScore >= 65
        ? "text-yellow-600"
        : "text-red-700";

  const canSearch = !!fromLoc && !!toLoc && !isCalculating;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-brand-teal text-white shadow-lg z-50 relative">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                FloodSafe Navigator
              </h1>
              <p className="text-xs text-white/70">
                Real-time flood-aware routing — India
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs bg-white/10 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>{lastUpdate}</span>
            </div>
            <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">
              🇮🇳 India
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Map section */}
        <div className="relative" style={{ height: "580px" }}>
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Route planner overlay */}
          <div
            className="absolute top-4 left-4 z-[1000] w-76"
            data-ocid="route_planner.panel"
          >
            <Card
              className="shadow-2xl border-0 overflow-hidden"
              style={{ width: "296px" }}
            >
              <CardHeader
                className="py-3 px-4"
                style={{ background: "#1F6F7E" }}
              >
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-white" />
                  <CardTitle className="text-white text-sm font-bold tracking-wider uppercase">
                    Plan Your Route
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <LocationSearchInput
                  label="From"
                  value={fromText}
                  onChange={(v) => {
                    setFromText(v);
                    setFromLoc(null);
                  }}
                  onSelect={(loc) => {
                    setFromLoc(loc);
                    setFromText(loc.name);
                  }}
                  placeholder="Search start location in India…"
                  ocidPrefix="route_from"
                  extraAction={
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={isGeolocating}
                      className="flex items-center gap-1 text-[10px] text-primary font-semibold hover:text-primary/80 transition-colors disabled:opacity-50"
                      data-ocid="route_planner.toggle"
                      title="Use my current location"
                    >
                      {isGeolocating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <MapPin className="w-3 h-3" />
                      )}
                      Use My Location
                    </button>
                  }
                />

                <LocationSearchInput
                  label="To"
                  value={toText}
                  onChange={(v) => {
                    setToText(v);
                    setToLoc(null);
                  }}
                  onSelect={(loc) => {
                    setToLoc(loc);
                    setToText(loc.name);
                  }}
                  placeholder="Search destination in India…"
                  ocidPrefix="route_to"
                />

                <Button
                  className="w-full h-9 text-sm font-semibold"
                  style={{
                    background: canSearch ? "#2EAD4A" : undefined,
                    color: canSearch ? "white" : undefined,
                  }}
                  disabled={!canSearch}
                  onClick={handleFindRoute}
                  data-ocid="route_planner.primary_button"
                >
                  {isCalculating ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      Calculating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      Find Safe Route
                    </span>
                  )}
                </Button>

                {!fromLoc && fromText.length > 0 && fromText.length < 3 && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    Type at least 3 characters to search
                  </p>
                )}

                {route && !isCalculating && (
                  <div
                    className="pt-2 border-t border-border space-y-2"
                    data-ocid="route_planner.card"
                  >
                    {/* ETA — most prominent */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <Clock className="w-4 h-4 text-green-700" />
                        <span className="text-2xl font-black text-green-700">
                          {route.timeMin} mins away
                        </span>
                      </div>
                      <p className="text-[11px] text-green-600 font-medium">
                        Estimated travel time
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <Ruler className="w-3.5 h-3.5 mx-auto mb-0.5 text-primary" />
                        <div className="text-sm font-bold">
                          {route.distanceKm} km
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Distance
                        </div>
                      </div>
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <Shield className="w-3.5 h-3.5 mx-auto mb-0.5 text-primary" />
                        <div className={`text-sm font-bold ${safetyColor}`}>
                          {route.safetyScore}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Safety Score
                        </div>
                      </div>
                    </div>

                    {route.warning && (
                      <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-yellow-800 leading-tight">
                          {route.warning}
                        </p>
                      </div>
                    )}

                    <div className="text-[11px] text-muted-foreground">
                      Route via: {route.segments.map((s) => s.name).join(" → ")}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Legend */}
          <div
            className="absolute bottom-4 left-4 z-[1000]"
            data-ocid="legend.card"
          >
            <Card className="shadow-xl border-0 py-0">
              <CardContent className="p-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Flood Status
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-2.5 rounded-full"
                    style={{ background: "#C62828" }}
                  />
                  <span className="text-xs font-medium">High Flood Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-2.5 rounded-full"
                    style={{ background: "#F2C94C" }}
                  />
                  <span className="text-xs font-medium">Moderate Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-2.5 rounded-full"
                    style={{ background: "#2EAD4A" }}
                  />
                  <span className="text-xs font-medium">Safe Route</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <span className="text-base">⚠</span>
                  <span className="text-xs font-medium text-destructive">
                    Warning Zone
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top-right: Weather + Flood alert */}
          <div
            className="absolute top-4 right-4 z-[1000] flex flex-col gap-2"
            style={{ maxWidth: "240px" }}
          >
            {/* Flood alert */}
            <div
              className="flex items-start gap-2 rounded-xl px-3 py-2.5 shadow-lg text-white"
              style={{ background: "rgba(198,40,40,0.92)" }}
              data-ocid="flood_alert.card"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold">Active Flood Alert — India</p>
                <p className="text-[11px] text-white/80">
                  Multiple states: avoid low-lying coastal and riverside roads
                </p>
              </div>
            </div>

            {/* Weather widget */}
            {weatherData && <WeatherCard weather={weatherData} />}
          </div>
        </div>

        {/* Feature highlights */}
        <section className="bg-white border-t border-border py-10 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold" style={{ color: "#1F6F7E" }}>
                How FloodSafe Navigator Works
              </h2>
              <p className="text-muted-foreground mt-1 text-sm max-w-xl mx-auto">
                Real-time flood data from IoT cloud sensors powers color-coded
                routing, helping you navigate safely through flood events across
                India.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Radio className="w-6 h-6" />}
                title="IoT Sensor Network"
                description="Water-level sensors placed on roads, bridges, and underpasses across India transmit live readings to the cloud every 60 seconds."
                step="01"
              />
              <FeatureCard
                icon={<Activity className="w-6 h-6" />}
                title="Cloud Data Processing"
                description="The cloud platform aggregates sensor data, classifies severity (High / Moderate / Safe), and pushes updates to the app via API."
                step="02"
              />
              <FeatureCard
                icon={<MapIcon className="w-6 h-6" />}
                title="Color-Coded Live Map"
                description="The map renders road segments in red, yellow, or green based on current flood severity. The safest route is calculated and highlighted instantly."
                step="03"
              />
            </div>

            {/* System flow */}
            <div className="mt-10 bg-muted rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-5">
                Sensor Data Flow — Execution Process
              </h3>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {FLOW_STEPS.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className="flex flex-col items-center text-center w-28">
                      <div
                        className="w-12 h-12 rounded-xl text-2xl shadow-sm bg-white flex items-center justify-center"
                        style={{ border: "2px solid #1F6F7E22" }}
                      >
                        {step.icon}
                      </div>
                      <p
                        className="text-xs font-bold mt-2"
                        style={{ color: "#1F6F7E" }}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                    {i < FLOW_STEPS.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats row */}
        <section className="py-8 px-4" style={{ background: "#1F6F7E" }}>
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-white text-center">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-xs text-white/70 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="py-5 px-4 text-center text-xs text-white/70"
        style={{ background: "#0F4F5A" }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>
              FloodSafe Navigator — Sensor-powered flood routing across India
            </span>
          </div>
          <span className="hidden sm:block opacity-40">·</span>
          <span>
            © {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              className="underline hover:text-white transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              caffeine.ai
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  step,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  step: string;
}) {
  return (
    <div className="relative bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-card transition-shadow">
      <div className="absolute top-4 right-4 text-4xl font-black text-muted/40 select-none">
        {step}
      </div>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3"
        style={{ background: "#1F6F7E" }}
      >
        {icon}
      </div>
      <h3 className="font-bold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
