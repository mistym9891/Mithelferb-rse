import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import L, { Icon } from 'leaflet';
import { AvailableStaff } from '../types';

// Custom icons (blue for agricultural, red for urban)
const agriculturalIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const urbanIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface MapViewProps {
  rings: any[]; // GeoJSON FeatureCollection
  staff: AvailableStaff[];
  center: [number, number];
}

const MapView: React.FC<MapViewProps> = ({ rings, staff, center }) => {
  const mapRef = useRef<L.Map>(null);
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, 10);
    }
  }, [center]);

  return (
    <MapContainer
      ref={mapRef}
      center={center}
      zoom={10}
      style={{ height: '500px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {rings && rings.length > 0 && (
        <GeoJSON
          data={{ type: 'FeatureCollection', features: rings }}
          style={() => ({
            color: '#2563eb',
            weight: 2,
            fillColor: '#93c5fd',
            fillOpacity: 0.2,
          })}
        />
      )}
      {staff.map((s) => (
        <Marker
          key={s.id}
          position={[0, 0]} // We need coordinates; we don't have lat/lng in AvailableStaff – we need to store location in staff.
          // Since we don't have geolocation per staff, we'll skip markers or use town coordinates.
          // In a real implementation, staff would have a stored location (city coords) from the location list.
          // For now, we'll use a placeholder or skip.
          icon={s.type === 'agricultural' ? agriculturalIcon : urbanIcon}
        />
      ))}
    </MapContainer>
  );
};

export default MapView;