import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateRepairerDeviceType } from '../utils/repairerDeviceTypeUtils';
import { repairerService } from '../services/repairerService';
import { Repairer } from '../models/repairer';
import { Button, Card, Text, Badge, Group, Loader } from '@mantine/core';
import { CalculateRouteResponse, fastPlanEcoService } from '../services/fastPlanEcoService';
import { useSelector } from 'react-redux';
import { RootState } from '../stores/globalStore';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import marker from'../assets/img/marker-icon.png';
import markerhighlight from'../assets/img/marker-icon-highlight.png';
import { ADEME_DATASET, isAdemeSource } from '../utils/dataAttribution';
import { partnerActivities } from '../utils/partnerTypes';

const startIcon = new L.Icon({
  iconUrl: marker,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const endIcon = new L.Icon({
  iconUrl: markerhighlight, // Using highlight for end point
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapUpdater({ routeData, userLocation, repairerLocation }: { routeData: any, userLocation: any, repairerLocation: any }) {
  const map = useMap();

  useEffect(() => {
    if (routeData && routeData.geometry && routeData.geometry.coordinates.length > 0 && userLocation && repairerLocation) {
      const allCoords = routeData.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
      allCoords.push([userLocation.lat, userLocation.lng]);
      allCoords.push([repairerLocation.lat, repairerLocation.lng]);
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] }); // Add some padding
    }
  }, [map, routeData, userLocation, repairerLocation]);

  return null;
}

const RepairerDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>(); // Utilise useParams pour obtenir l'ID du réparateur
  const [repairer, setRepairer] = useState<Repairer | null>(null);
  const [routeData, setRouteData] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<any | null>(null);
  const [repairerLocation, setRepairerLocation] = useState<any | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const history = useHistory();

  const { latitude, longitude } = useSelector((state: RootState) => state.auth);
  const [isExporting, setIsExporting] = useState(false);
  const [cachedGoogleMapsUrl, setCachedGoogleMapsUrl] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (id) {
      repairerService.getRepairer(id).then(setRepairer); // Assure-toi que get(id) existe dans repairerService
    }
  }, [id]);

  useEffect(() => {
    const geocodeLocations = async () => {
      setIsGeocoding(true);
      try {
        // Geocode user's location
        if (latitude && longitude) {
          // In a real app, you'd reverse geocode lat/lon to an address string first
          // For simplicity, let's assume a mock address for user's location
          // Or, if the API supports geocoding lat/lon, use that.
          // The API only supports address string to lat/lon.
          // So, for now, we will use a mock address for the user's location.
          // In a real app, we would need a reverse geocoding service.
          setUserLocation({
            address: "User's Current Location", // Placeholder
            lat: latitude,
            lng: longitude,
          });
        } else {
          setUserLocation(null);
        }

        // Geocode repairer's address
        if (repairer?.latitude && repairer?.longitude) {
          setRepairerLocation({
            address: repairer.address,
            lat: repairer.latitude,
            lng: repairer.longitude,
          });
        } else if (repairer?.address) {
          const geocodedRepairer = await fastPlanEcoService.geocodeAddress({ query: repairer.address });
          setRepairerLocation(geocodedRepairer);
        } else {
          setRepairerLocation(null);
        }
      } catch (error) {
        console.error("Error geocoding locations:", error);
        setUserLocation(null);
        setRepairerLocation(null);
      } finally {
        setIsGeocoding(false);
      }
    };

    geocodeLocations();
  }, [repairer, latitude, longitude]);

  useEffect(() => {
    if (userLocation && repairerLocation && !isGeocoding) {
      const fetchRouteData = async () => {
        setIsRouteLoading(true);
        try {
          const data : CalculateRouteResponse = await fastPlanEcoService.calculateRoute({
            baseAddress: userLocation,
            followingAddresses: [repairerLocation],
            vehicle: "car", // Default vehicle type
          });
          console.log("Route data:", data);
          setRouteData(data);
        } catch (error) {
          console.error("Error calculating route:", error);
          setRouteData(null);
        } finally {
          setIsRouteLoading(false);
        }
      };
      fetchRouteData();
    }
  }, [userLocation, repairerLocation, isGeocoding]);

  const handleExportToGoogleMaps = async () => {
    if (userLocation && repairerLocation && id) {
      setIsExporting(true);
      let urlToOpen = cachedGoogleMapsUrl[id];

      if (!urlToOpen) {
        try {
          const response = await fastPlanEcoService.exportGoogleMaps({
            waypoints: [
              {
                address: userLocation.address,
                lat: userLocation.lat,
                lng: userLocation.lng,
              },
              {
                address: repairerLocation.address,
                lat: repairerLocation.lat,
                lng: repairerLocation.lng,
              },
            ],
          });
          urlToOpen = response.url;
          setCachedGoogleMapsUrl(prev => ({ ...prev, [id]: urlToOpen }));
        } catch (error) {
          console.error("Error exporting to Google Maps:", error);
          // Optionally show a notification to the user
          setIsExporting(false);
          return;
        }
      }

      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.location.href = urlToOpen;
      } else {
        console.error("Failed to open new window. Pop-up blocked?");
        // Optionally, inform the user that pop-ups might be blocked
      }
      setIsExporting(false);
    }
  };

  if (!repairer || isGeocoding || !userLocation || !repairerLocation) {
    return <div>{t('repairerDetails.loadingRoute')}</div>;
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8 mt-4">
        <div className="flex flex-col gap-8">
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-4 flex items-center text-gray-800 dark:text-white">
              <span className="material-symbols-outlined mr-3 text-blue-600 dark:text-blue-400">business</span>
              {repairer.name}
              {partnerActivities(repairer.partner_type).map((activity) => (
                <Badge
                  key={activity}
                  variant="filled"
                  color={activity === 'recycler' ? 'green' : activity === 'reuse' ? 'teal' : 'blue'}
                  size="md"
                  className="ml-3"
                >
                  {t(`repairMap.partnerTypeOptions.${activity}`)}
                </Badge>
              ))}
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 mr-3 text-2xl mt-1">location_on</span>
                <div>
                  <Text size="sm" color="dimmed">{t('repairerDetails.address')}</Text>
                  <Text>{repairer.address}, {repairer.postal_code}, {repairer.countryName ?? repairer.country}</Text>
                </div>
              </div>
              {repairer.phone && (
                <div className="flex items-start">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 mr-3 text-2xl mt-1">phone</span>
                  <div>
                    <Text size="sm" color="dimmed">{t('repairerDetails.phone')}</Text>
                    <Text>{repairer.phone}</Text>
                  </div>
                </div>
              )}
              {repairer.email && (
                <div className="flex items-start">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 mr-3 text-2xl mt-1">email</span>
                  <div>
                    <Text size="sm" color="dimmed">{t('repairerDetails.email')}</Text>
                    <a href={`mailto:${repairer.email}`} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                      {repairer.email}
                    </a>
                  </div>
                </div>
              )}
              {repairer.website && (
                <div className="flex items-start">
                  <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 mr-3 text-2xl mt-1">language</span>
                  <div>
                    <Text size="sm" color="dimmed">{t('repairerDetails.website')}</Text>
                    <a href={repairer.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                      {repairer.website}
                    </a>
                  </div>
                </div>
              )}
              {repairer.source && (
                <div className="flex items-start">
                  <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 mr-3 text-2xl mt-1">database</span>
                  <div>
                    <Text size="sm" color="dimmed">{t('repairerDetails.source')}</Text>
                    <Badge variant="filled" color="dark" size="sm">{repairer.source}</Badge>
                    {isAdemeSource(repairer.source) && (
                      <Text size="xs" color="dimmed" mt={4}>
                        {t('repairerDetails.dataFrom')}{' '}
                        <a href={ADEME_DATASET.url} target="_blank" rel="noopener noreferrer" className="underline">
                          {ADEME_DATASET.name}
                        </a>
                        , {ADEME_DATASET.licence}
                      </Text>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Card shadow="sm" p="lg" radius="md" withBorder>
            <h2 className="text-2xl font-bold mb-4 flex items-center text-gray-800 dark:text-white">
              <span className="material-symbols-outlined mr-2 text-green-600 dark:text-green-400">build</span>
              {t('repairerDetails.repairServices')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {repairer.repairerDevices.map((device, index) => (
                <Badge key={index} variant="light" size="lg">{translateRepairerDeviceType(device.device_type, t)}</Badge>
              ))}
            </div>
          </Card>

          <Card shadow="sm" p="lg" radius="md" withBorder>
            <h2 className="text-2xl font-bold mb-4 flex items-center text-gray-800 dark:text-white">
              <span className="material-symbols-outlined mr-2 text-blue-600 dark:text-blue-400">route</span>
              {t('repairerDetails.routeInfo')}
            </h2>
            {isRouteLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Loader />
              </div>
            ) : routeData ? (
              <>
                <div className="flex flex-wrap justify-around items-center gap-4">
                  <div className="flex flex-col items-center p-3 rounded-lg shadow-sm">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">straighten</span>
                    <div>
                      <Text size="sm" color="dimmed">{t('repairerDetails.distance')}</Text>
                      <Text size="xl" fw={700}>{parseFloat(routeData.totalDistance).toFixed(2)} km</Text>
                    </div>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg shadow-sm">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">schedule</span>
                    <div>
                      <Text size="sm" color="dimmed">{t('repairerDetails.duration')}</Text>
                      <Text size="xl" fw={700}>{Math.round(routeData.totalTime)} min</Text>
                    </div>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg shadow-sm">
                    <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-3xl">eco</span>
                    <div>
                      <Text size="sm" color="dimmed">{t('repairerDetails.carbonFootprint')}</Text>
                      <Text size="xl" fw={700}>{(routeData.carbonFootprint / 1000).toFixed(2)} kg CO₂</Text>
                    </div>
                  </div>
                </div>
                <div className="mt-4" style={{ height: '400px', width: '100%' }}>
                  <MapContainer
                    center={[userLocation.lat, userLocation.lng]} // Initial center
                    zoom={10} // Initial zoom
                    style={{ height: '100%', width: '100%' }}
                    className="z-0 rounded-lg"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {routeData.geometry && routeData.geometry.coordinates.length > 0 && (
                      <Polyline
                        positions={routeData.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]])} // Swap lat/lon
                        color="blue"
                        weight={5}
                      />
                    )}
                    {userLocation && (
                      <Marker position={[userLocation.lat, userLocation.lng]} icon={startIcon}>
                        <Popup>{t('repairMap.yourLocation')}</Popup>
                      </Marker>
                    )}
                    {repairerLocation && (
                      <Marker position={[repairerLocation.lat, repairerLocation.lng]} icon={endIcon}>
                        <Popup>{repairer.name}</Popup>
                      </Marker>
                    )}
                    <MapUpdater routeData={routeData} userLocation={userLocation} repairerLocation={repairerLocation} />
                  </MapContainer>
                </div>
                <Group mt="md">
                  <Button
                    onClick={handleExportToGoogleMaps}
                    leftSection={<span className="material-symbols-outlined">directions</span>}
                    color="blue"
                    loading={isExporting}
                  >
                    {t('repairerDetails.openInMaps')}
                  </Button>
                </Group>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Text color="dimmed">{t('repairerDetails.routeError')}</Text>
              </div>
            )}
          </Card>
        </div>
        <Button className='mt-5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 transition-colors duration-200' size="small" onClick={() => history.push('/app/repair-map')}>
          {t('repairerDetails.backToMap')}
        </Button>
      </div>
    </>
  );
};

export default RepairerDetails;
