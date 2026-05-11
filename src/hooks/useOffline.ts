import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useOffline(): boolean {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    NetInfo.fetch().then((state) => setIsOffline(state.isConnected === false));
    return unsub;
  }, []);

  return isOffline;
}
