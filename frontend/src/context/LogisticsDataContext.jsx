import { createContext, useContext, useEffect, useState } from 'react';
import { loadZipTables, buildModel } from '../lib/model';

const LogisticsDataContext = createContext(null);

export function LogisticsDataProvider({ children }) {
  const [state, setState] = useState({ model: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    loadZipTables()
      .then(buildModel)
      .then((model) => { if (!cancelled) setState({ model, loading: false, error: null }); })
      .catch((error) => { if (!cancelled) setState({ model: null, loading: false, error }); });
    return () => { cancelled = true; };
  }, []);

  return <LogisticsDataContext.Provider value={state}>{children}</LogisticsDataContext.Provider>;
}

export function useLogisticsData() {
  return useContext(LogisticsDataContext);
}
