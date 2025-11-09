
import { useState, useEffect } from 'react';

interface GeolocationState {
  location: {
    latitude: number;
    longitude: number;
  } | null;
  error: string | null;
}

export const useGeolocation = (): GeolocationState => {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prevState => ({ ...prevState, error: 'Geolocation is not supported by your browser.' }));
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        error: null,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      setState(prevState => ({ ...prevState, error: error.message }));
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError);
    
    // Optional: Watch for position changes
    // const watcher = navigator.geolocation.watchPosition(onSuccess, onError);
    // return () => navigator.geolocation.clearWatch(watcher);

  }, []);

  return state;
};
