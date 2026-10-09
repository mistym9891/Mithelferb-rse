import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AvailableStaff, RingInfo, RingTown } from '../types';
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

/**
 * Marker der Geschäftsstelle. Zeigt das Kurzzeichen des Rings – „MR SHA“ statt
 * nur „MR“, damit auf der Karte erkennbar ist, um welchen Ring es sich handelt.
 * Die Breite richtet sich nach der Länge des Kurzzeichens.
 */
function officeIcon(shortCode?: string | null): L.DivIcon {
  const label = shortCode ? `MR ${shortCode}` : 'MR';
  const width = 16 + label.length * 7.4;
  return new L.DivIcon({
    className: 'staff-marker',
    html: `<div class="office-marker">${label}</div>`,
    iconSize: [width, 22],
    iconAnchor: [width / 2, 11],
  });
}

/**
 * Orte und Teilorte, sobald weit genug hineingezoomt wurde.
 *
 * Die Ortsliste enthält auch Teilorte („Enslingen“, „Gailenkirchen“). Ab
 * Zoomstufe 11 werden sie in der Ringfarbe eingeblendet, damit erkennbar ist,
 * welcher Teilort zu welchem Ring gehört. Darunter wären es über 1.300 Punkte
 * auf einmal – unlesbar und langsam.
 */
const MIN_TOWN_ZOOM = 11;

const TownLayer: React.FC<{
  towns: RingTown[];
  visibleRingIds: Set<number>;
  colorFor: (ringId: number, dark?: boolean) => string;
  dark: boolean;
}> = ({ towns, visibleRingIds, colorFor, dark }) => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [bounds, setBounds] = useState(map.getBounds());

  useEffect(() => {
    const update = () => { setZoom(map.getZoom()); setBounds(map.getBounds()); };
    map.on('zoomend moveend', update);
    return () => { map.off('zoomend moveend', update); };
  }, [map]);

  if (zoom < MIN_TOWN_ZOOM) return null;

  // Nur zeichnen, was im Bildausschnitt liegt – sonst hängen bei Zoomstufe 11
  // mehrere hundert Beschriftungen im DOM.
  const sichtbar = towns.filter(t =>
    visibleRingIds.has(t.ring_id) && bounds.contains([t.lat, t.lng] as [number, number])
  );

  return (
    <>
      {sichtbar.map(t => (
        <Marker
          key={`town-${t.id}`}
          position={[t.lat, t.lng]}
          interactive={false}
          keyboard={false}
          icon={new L.DivIcon({
            className: 'town-marker',
            html:
              `<span class="town-dot" style="background:${colorFor(t.ring_id, dark)}"></span>` +
              `<span class="town-label">${t.name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [4, 4],
          })}
        />
      ))}
    </>
  );
};

/**
 * Setzt den Kartenausschnitt auf die Geschäftsstelle des angemeldeten Rings.
 *
 * Wichtig: nur einmal je Zielposition und nur solange der Benutzer die Karte
 * noch nicht selbst bewegt hat. Vorher wurde bei jedem erneuten Rendern
 * `setView` aufgerufen – die Karte sprang dadurch nach jedem Hineinzoomen
 * sofort wieder auf die Startansicht zurück, das Zoomen war praktisch
 * blockiert.
 */
const Recenter: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  const appliedRef = useRef<string>('');
  const userMovedRef = useRef(false);

  useEffect(() => {
    // Jede Bewegung durch den Benutzer schaltet das automatische Zentrieren ab.
    const onUserMove = () => { userMovedRef.current = true; };
    map.on('zoomstart dragstart', onUserMove);
    return () => { map.off('zoomstart dragstart', onUserMove); };
  }, [map]);

  useEffect(() => {
    const target = `${center[0].toFixed(5)},${center[1].toFixed(5)},${zoom}`;
    if (appliedRef.current === target) return;      // schon angewandt
    if (appliedRef.current !== '' && userMovedRef.current) {
      // Ziel hat sich geändert (anderer Ring) – Benutzerposition darf
      // überschrieben werden, danach gilt wieder „nicht hineinreden“.
      userMovedRef.current = false;
    } else if (userMovedRef.current) {
      return;
    }
    appliedRef.current = target;
    map.setView(center, zoom);
  }, [map, center[0], center[1], zoom]);

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
  /** Orte und Teilorte, ab Zoomstufe 11 eingeblendet. */
  towns?: RingTown[];
}

const MapView: React.FC<MapViewProps> = ({
  rings, offices, staff, center, zoom = 10, colorFor, ringIdByName, towns = [],
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
      {/* Kartenhintergrund: basemap.de Web Raster des Bundesamtes für
          Kartographie und Geodäsie (BKG) – dieselbe Stelle, von der auch die
          amtlichen Gemeindegrenzen (VG250) dieser App stammen.

          Zuvor lagen hier die Kacheln von tile.openstreetmap.org. Das sind
          ehrenamtlich betriebene Server, deren Nutzungsbedingungen den Einsatz
          als Hintergrund einer Anwendung ausdrücklich nicht vorsehen. Sie haben
          die Zugriffe des Kunden mit „Access blocked" beantwortet – auf dem
          Rechner sichtbar, auf dem Handy zunächst nicht, weil dort noch
          zwischengespeicherte Kacheln lagen. basemap.de ist für genau diesen
          Zweck gedacht, braucht keinen Schlüssel und steht unter dl-de/by-2-0.

          Im Dunkelmodus wird die graue Fassung geladen und zusätzlich per
          CSS-Regel auf `.dark .leaflet-tile-pane` abgedunkelt. Der Wechsel der
          URL erzeugt über `key` bewusst eine neue Ebene; die CSS-Regel greift
          davon unabhängig sofort, weil Leaflet die className-Prop nur beim
          Anlegen einer Ebene auswertet. */}
      <TileLayer
        key={dark ? 'bm-grau' : 'bm-farbe'}
        url={`https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/${
          dark ? 'de_basemapde_web_raster_grau' : 'de_basemapde_web_raster_farbe'
        }/default/GLOBAL_WEBMERCATOR/{z}/{y}/{x}.png`}
        attribution='&copy; <a href="https://basemap.de/">basemap.de / BKG</a> (<a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>)'
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
          <Marker
            key={`office-${o.id}`}
            position={[o.office_lat!, o.office_lng!]}
            icon={officeIcon(o.short_code)}
          >
            <Popup>
              <strong><RingLink name={o.name} website={o.website} /></strong>
              <br />
              Geschäftsstelle{o.short_code ? ` (MR ${o.short_code})` : ''}:
              <br />
              {o.office_street && <>{o.office_street}<br /></>}
              {o.office_town}
            </Popup>
          </Marker>
        ))}

      {/* Orte und Teilorte – erst ab Zoomstufe 11 */}
      <TownLayer
        towns={towns}
        visibleRingIds={new Set(offices.map(o => o.id))}
        colorFor={colorFor}
        dark={dark}
      />

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
