import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export function useLocation() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestLocation = async () => {
    setIsRequesting(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return null;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      };
      setLocation(coords);
      return coords;
    } catch (e: any) {
      setErrorMsg(e.message);
      return null;
    } finally {
      setIsRequesting(false);
    }
  };

  return { location, errorMsg, isRequesting, requestLocation };
}
