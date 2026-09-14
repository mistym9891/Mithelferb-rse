import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AvailableStaff, RingInfo } from '../types';
import { useTheme } from '../hooks/useTheme';
import RingLink from './RingLink';

/**
 * Marker per requirement 4 of the Anforderungen: a coloured button showing
 * "Kürzel, Std./Tag, S|L". Pink = weiblich, blue = männlich.
 * Example for Regina Fuchs: a pink button reading "FR, 6, S".
 */
/**
 * @param stackIndex position within a group of helpers living in the same town
 * @param stackSize  size of that group
 * Co-located markers are offset vertically in PIXELS via the icon anchor, so
 * they stay readable at every zoom level.
 */
function staffIcon(s: AvailableStaff, stackIndex = 0, stackSize = 1): L.DivIcon {
  const genderClass =
    s.gender === 'female' ? 'staff-marker-female'
    : s.gender === 'male' ? 'staff-marker-male'
    : 'staff-marker-unknown';
  const kind = s.type === 'agricultural' ? 'L' : 'S';
  const label = `${s.abbreviation}, ${s.hours_per_day}, ${kind}`;
  const width = 18 + label.length * 7.2;
  const rowHeight = 26;
  const offsetY = (stackIndex - (stackSize - 1) / 2) * rowHeight;
  // Erst künftig freie Mitarbeiter werden gestrichelt und blasser dargestellt.
  const upcoming = s.is_current ? '' : ' staff-marker-upcoming';
  const from = s.is_current ? '' : ` title="frei ab ${new Date(s.start_date).toLocaleDateString('de-DE')}"`;
  return new L.DivIcon({
    className: 'staff-marker',
    html: `<div class="staff-marker-button ${genderClass}${upcoming}"${from}>${label}</div>`,
    iconSize: [width, 24],
    iconAnchor: [width / 2, 12 + offsetY],
  });
}

const officeIcon = new L.DivIcon({
  className: 'staff-marker',
  html: '<div class="office-marker">MR</div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/** Imperatively recentre the map when the selected centre changes. */
const Recenter: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center[0], center[1], zoom]);
  return null;
};

const fmt = (d: string) => new Date(d).toLocaleDateString('de-DE');

/** Detailanzeige eines freien Mitarbeiters – für Hover-Tooltip und Klick-Popup. */
const StaffDetails: React.FC<{ s: AvailableStaff; plain?: boolean }> = ({ s, plain }) => (
  <div className="text-sm text-gray-900 dark:text-gray-100 min-w-[13rem]">
    <div className="font-bold text-base">
      {s.abbreviation}
      {s.is_own_ring && s.first_name ? ` – ${s.first_name} ${s.last_name}` : ''}
    </div>
    <div>{s.town}</div>
    <div>
      {s.type === 'agricultural' ? 'landwirtschaftlich' : 'städtisch'} · {s.hours_per_day} Std./Tag
      {s.gender !== 'unknown' && (s.gender === 'female' ? ' · weiblich' : ' · männlich')}
    </div>
    <div className="mt-1"><RingLink name={s.ring_name} website={s.ring_website} plain={plain} /></div>
    {s.supervisor && <div>Einsatzleitung: {s.supervisor}</div>}
    {s.phone && <div>Tel.: {s.phone}</div>}
    {s.email && <div className="break-all">{s.email}</div>}
    <div className={`mt-1 font-semibold ${s.is_current ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
      {s.is_current ? 'jetzt frei' : 'frei ab'} {fmt(s.start_date)} – {fmt(s.end_date)}
    </div>
    {!s.is_own_ring && (
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Fremder Ring – Name nicht sichtbar
      </div>
    )}
  </div>
);

interface MapViewProps {
  rings: any[];               // GeoJSON features
  offices: RingInfo[];
  staff: AvailableStaff[];
  center: [number, number];
  zoom?: number;
  /** Farbe je Ring-ID – skaliert auf beliebig viele Ringe. */
  colorFor: (ringId: number, dark?: boolean) => string;
  ringIdByName: Map<string, number>;
}

const MapView: React.FC<MapViewProps> = ({
  rings, offices, staff, center, zoom = 10, colorFor, ringIdByName,
}) => {
  const dark = useTheme().resolved === 'dark';
  const featureColor = (name?: string) => {
    const id = name ? ringIdByName.get(name) : undefined;
    return id != null ? colorFor(id, dark) : (dark ? '#93c5fd' : '#2563eb');
  };

  // Staff without coordinates cannot be placed on the map. Several helpers
  // often live in the same town and would otherwise sit exactly on top of each
  // other, so co-located markers are spread around a small circle.
  const placeable = useMemo(() => {
    const withCoords = staff.filter(s => s.lat != null && s.lng != null);
    const groups = new Map<string, AvailableStaff[]>();
    for (const s of withCoords) {
      const key = `${s.lat!.toFixed(4)},${s.lng!.toFixed(4)}`;
      const list = groups.get(key);
      list ? list.push(s) : groups.set(key, [s]);
    }
    const spread: Array<AvailableStaff & { _i: number; _n: number }> = [];
    for (const list of groups.values()) {
      list.forEach((s, i) => spread.push({ ...s, _i: i, _n: list.length }));
    }
    return spread;
  }, [staff]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={6}
      maxZoom={18}
      style={{ height: '100%', width: '100%' }}
      zoomControl                /* +/- Schaltflächen */
      scrollWheelZoom            /* Mausrad */
      doubleClickZoom            /* Doppelklick */
      touchZoom                  /* Zwei-Finger-Geste auf Handy/Tablet */
      boxZoom
      keyboard                   /* +/- und Pfeiltasten */
    >
      <Recenter center={center} zoom={zoom} />
      {/* Im Dunkelmodus werden dieselben OSM-Kacheln abgedunkelt. Das geschieht
          bewusst per CSS-Regel auf `.dark .leaflet-tile-pane` und NICHT über die
          className-Prop: Leaflet wertet className nur beim Anlegen der Ebene aus,
          ein Themenwechsel hätte sonst erst nach einem Neuladen gewirkt. */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      {rings.map((feature, i) => (
        <GeoJSON
          key={`${feature.properties?.name}-${i}`}
          data={feature}
          style={() => {
            const color = featureColor(feature.properties?.name);
            return { color, weight: dark ? 2 : 2.5, fillColor: color, fillOpacity: dark ? 0.14 : 0.08 };
          }}
          onEachFeature={(f, layer) => {
            layer.bindTooltip(f.properties?.name ?? 'Ring', { sticky: true });
          }}
        />
      ))}

      {offices
        .filter(o => o.office_lat != null && o.office_lng != null)
        .map(o => (
          <Marker key={`office-${o.id}`} position={[o.office_lat!, o.office_lng!]} icon={officeIcon}>
            <Popup>
              <strong><RingLink name={o.name} website={o.website} /></strong>
              <br />
              Geschäftsstelle: {o.office_town}
            </Popup>
          </Marker>
        ))}

      {placeable.map(s => (
        <Marker
          key={s.id}
          position={[s.lat!, s.lng!]}
          icon={staffIcon(s, s._i, s._n)}
          riseOnHover
        >
          {/* Maus: Details erscheinen beim Überfahren des Kürzels. */}
          {/* Der Button sitzt wegen der Stapelung um offsetY verschoben über dem
              Ankerpunkt – der Tooltip muss dieselbe Verschiebung ausgleichen. */}
          <Tooltip
            direction="top"
            offset={[0, -((s._i - (s._n - 1) / 2) * 26) - 14]}
            opacity={1}
            className="staff-tooltip"
          >
            <StaffDetails s={s} plain />
          </Tooltip>
          {/* Touch: dieselben Details beim Antippen (dort gibt es kein Hover). */}
          <Popup>
            <StaffDetails s={s} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;
