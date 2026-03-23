import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Clock,
  Droplets,
  MapIcon,
  Navigation,
  Radio,
  Ruler,
  Shield,
  Zap,
} from "lucide-react";

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

// --- Data ---
const NYC_LOCATIONS: Location[] = [
  { id: "times-square", name: "Times Square", coords: [40.758, -73.9855] },
  {
    id: "brooklyn-bridge",
    name: "Brooklyn Bridge",
    coords: [40.7061, -73.9969],
  },
  { id: "central-park", name: "Central Park", coords: [40.7851, -73.9683] },
  { id: "jfk-airport", name: "JFK Airport", coords: [40.6413, -73.7781] },
  { id: "flushing", name: "Flushing, Queens", coords: [40.7675, -73.833] },
  {
    id: "staten-island-ferry",
    name: "Staten Island Ferry",
    coords: [40.6437, -74.0735],
  },
];

const ROAD_SEGMENTS: RoadSegment[] = [
  {
    id: "seg-1",
    name: "FDR Drive (Lower)",
    coords: [
      [40.7061, -73.9969],
      [40.7128, -73.9846],
      [40.722, -73.9755],
    ],
    level: "high",
  },
  {
    id: "seg-2",
    name: "Atlantic Ave",
    coords: [
      [40.69, -73.98],
      [40.685, -73.965],
      [40.68, -73.95],
    ],
    level: "high",
  },
  {
    id: "seg-3",
    name: "Belt Parkway",
    coords: [
      [40.6413, -73.7781],
      [40.635, -73.82],
      [40.63, -73.87],
    ],
    level: "moderate",
  },
  {
    id: "seg-4",
    name: "Queens Blvd",
    coords: [
      [40.7675, -73.833],
      [40.755, -73.87],
      [40.744, -73.905],
    ],
    level: "moderate",
  },
  {
    id: "seg-5",
    name: "Broadway (Midtown)",
    coords: [
      [40.758, -73.9855],
      [40.765, -73.981],
      [40.772, -73.9775],
      [40.7851, -73.9683],
    ],
    level: "safe",
  },
  {
    id: "seg-6",
    name: "5th Avenue",
    coords: [
      [40.758, -73.9855],
      [40.764, -73.978],
      [40.771, -73.973],
      [40.778, -73.9645],
    ],
    level: "safe",
  },
  {
    id: "seg-7",
    name: "West Side Highway",
    coords: [
      [40.7061, -73.9969],
      [40.72, -74.005],
      [40.74, -74.01],
      [40.758, -74.002],
    ],
    level: "moderate",
  },
  {
    id: "seg-8",
    name: "Verrazzano Narrows",
    coords: [
      [40.606, -74.044],
      [40.617, -74.055],
      [40.628, -74.068],
    ],
    level: "safe",
  },
  {
    id: "seg-9",
    name: "Shore Road (Brooklyn)",
    coords: [
      [40.62, -74.03],
      [40.63, -74.01],
      [40.6437, -74.0735],
    ],
    level: "high",
  },
  {
    id: "seg-10",
    name: "Northern Blvd",
    coords: [
      [40.7675, -73.833],
      [40.768, -73.87],
      [40.77, -73.9],
      [40.772, -73.93],
    ],
    level: "safe",
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
  {
    coords: [40.7061, -73.9969],
    label: "Brooklyn Bridge Area — Severe Flooding",
  },
  { coords: [40.69, -73.98], label: "Atlantic Ave — Road Submerged" },
  {
    coords: [40.6437, -74.0735],
    label: "Staten Island Ferry Terminal — High Risk",
  },
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
  { value: "3", label: "Flood Zones" },
  { value: "60s", label: "Update Interval" },
  { value: "98.4%", label: "Uptime" },
];

function computeRoute(from: Location, to: Location): RouteResult {
  const safeSegs = ROAD_SEGMENTS.filter((s) => s.level === "safe");
  const modSegs = ROAD_SEGMENTS.filter((s) => s.level === "moderate");
  const highSegs = ROAD_SEGMENTS.filter((s) => s.level === "high");

  const latDiff = Math.abs(from.coords[0] - to.coords[0]);
  const lngDiff = Math.abs(from.coords[1] - to.coords[1]);
  const distKm = Math.round((latDiff + lngDiff) * 111 * 10) / 10;
  const timeMin = Math.round(distKm * 3.5 + 5);

  let chosenSegs: RoadSegment[] = [];
  let safetyScore = 95;
  let warning: string | undefined;

  const needsLower = from.coords[0] < 40.72 || to.coords[0] < 40.72;
  const needsUpper = from.coords[0] > 40.76 || to.coords[0] > 40.76;

  if (needsLower && needsUpper) {
    chosenSegs = [ROAD_SEGMENTS[6], ROAD_SEGMENTS[4]];
    safetyScore = 78;
    warning =
      "Avoid FDR Drive — severe flooding reported. West Side Highway has minor delays.";
  } else if (needsLower) {
    chosenSegs = [ROAD_SEGMENTS[6], ROAD_SEGMENTS[7]];
    safetyScore = 65;
    warning =
      "Shore Road and Atlantic Ave fully flooded. Use Verrazzano route.";
  } else if (needsUpper) {
    chosenSegs = [safeSegs[0], safeSegs[1] || safeSegs[0]];
    safetyScore = 94;
  } else {
    chosenSegs = [modSegs[0], safeSegs[0]];
    safetyScore = 82;
    warning = "Minor flooding on Queens Blvd. Allow extra 10 minutes.";
  }

  if (safetyScore < 70) {
    chosenSegs = [...chosenSegs, ...highSegs.slice(0, 1)];
  }

  return {
    from,
    to,
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

// --- Main App ---
export default function App() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylineLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastUpdate] = useState("Live — Updated 2 min ago");

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [40.73, -73.935],
      zoom: 11,
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

    for (const loc of NYC_LOCATIONS) {
      L.marker(loc.coords, { icon: locIcon }).bindTooltip(loc.name).addTo(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function handleFindRoute() {
    if (!fromId || !toId || fromId === toId) return;
    setIsCalculating(true);
    setTimeout(() => {
      const from = NYC_LOCATIONS.find((l) => l.id === fromId)!;
      const to = NYC_LOCATIONS.find((l) => l.id === toId)!;
      const computed = computeRoute(from, to);
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

      if (mapRef.current) {
        const bounds = L.latLngBounds([from.coords, to.coords]);
        mapRef.current.fitBounds(bounds, { padding: [60, 60] });
      }
    }, 900);
  }

  const safetyColor =
    route && route.safetyScore >= 85
      ? "text-green-600"
      : route && route.safetyScore >= 65
        ? "text-yellow-600"
        : "text-red-700";

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
                Real-time flood-aware routing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs bg-white/10 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>{lastUpdate}</span>
            </div>
            <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">
              NYC Metro
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
            className="absolute top-4 left-4 z-[1000] w-72"
            data-ocid="route_planner.panel"
          >
            <Card className="shadow-2xl border-0 overflow-hidden">
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
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    From
                  </p>
                  <Select value={fromId} onValueChange={setFromId}>
                    <SelectTrigger
                      className="h-9 text-sm"
                      data-ocid="route_planner.select"
                    >
                      <SelectValue placeholder="Select start location" />
                    </SelectTrigger>
                    <SelectContent>
                      {NYC_LOCATIONS.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    To
                  </p>
                  <Select value={toId} onValueChange={setToId}>
                    <SelectTrigger
                      className="h-9 text-sm"
                      data-ocid="route_planner.select"
                    >
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {NYC_LOCATIONS.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full h-9 text-sm font-semibold"
                  style={{ background: "#2EAD4A", color: "white" }}
                  disabled={
                    !fromId || !toId || fromId === toId || isCalculating
                  }
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

                {route && !isCalculating && (
                  <div
                    className="pt-2 border-t border-border space-y-2"
                    data-ocid="route_planner.card"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-primary" />
                        <div className="text-sm font-bold">
                          {route.timeMin}m
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Time
                        </div>
                      </div>
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <Ruler className="w-3.5 h-3.5 mx-auto mb-0.5 text-primary" />
                        <div className="text-sm font-bold">
                          {route.distanceKm}km
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
                          Safety
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

          {/* Flood alert */}
          <div
            className="absolute top-4 right-4 z-[1000] max-w-xs"
            data-ocid="flood_alert.card"
          >
            <div
              className="flex items-start gap-2 rounded-xl px-3 py-2.5 shadow-lg text-white"
              style={{ background: "rgba(198,40,40,0.92)" }}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold">Active Flood Alert — NYC</p>
                <p className="text-[11px] text-white/80">
                  Lower Manhattan & South Brooklyn: avoid coastal roads
                </p>
              </div>
            </div>
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
                routing, helping you navigate safely through flood events.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Radio className="w-6 h-6" />}
                title="IoT Sensor Network"
                description="Water-level sensors placed on roads, bridges, and underpasses transmit live readings to the cloud every 60 seconds."
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
              FloodSafe Navigator — Sensor-powered flood routing for NYC
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
