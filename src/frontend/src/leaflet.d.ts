// Minimal ambient types for Leaflet loaded from CDN
// This file has no exports intentionally — it declares a global namespace.
/* eslint-disable */
declare namespace L {
  type LatLngExpression = [number, number] | { lat: number; lng: number };

  interface FitBoundsOptions {
    padding?: [number, number];
  }

  interface PolylineOptions {
    color?: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
  }

  interface TooltipOptions {
    sticky?: boolean;
  }

  interface DivIconOptions {
    html?: string;
    className?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
  }

  interface MarkerOptions {
    icon?: DivIcon;
  }

  interface TileLayerOptions {
    attribution?: string;
    maxZoom?: number;
  }

  interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    zoomControl?: boolean;
  }

  interface Layer {
    addTo(map: Map | LayerGroup): this;
    remove(): this;
  }

  interface Polyline extends Layer {
    bindTooltip(content: string, options?: TooltipOptions): this;
  }

  interface Marker extends Layer {
    bindPopup(content: string): this;
    bindTooltip(content: string): this;
  }

  interface DivIcon {
    _tag?: "DivIcon";
  }

  interface LayerGroup extends Layer {
    clearLayers(): this;
  }

  interface TileLayer extends Layer {
    _tag?: "TileLayer";
  }

  interface LatLngBounds {
    _tag?: "LatLngBounds";
  }

  interface Map {
    remove(): void;
    fitBounds(bounds: LatLngBounds, options?: FitBoundsOptions): this;
  }

  interface IconDefault {
    prototype: { _getIconUrl?: unknown };
    mergeOptions(options: Record<string, string>): void;
  }

  const Icon: { Default: IconDefault };

  function map(el: HTMLElement, options?: MapOptions): Map;
  function tileLayer(url: string, options?: TileLayerOptions): TileLayer;
  function layerGroup(): LayerGroup;
  function polyline(
    coords: LatLngExpression[],
    options?: PolylineOptions,
  ): Polyline;
  function marker(coords: LatLngExpression, options?: MarkerOptions): Marker;
  function divIcon(options?: DivIconOptions): DivIcon;
  function latLngBounds(points: LatLngExpression[]): LatLngBounds;
}
