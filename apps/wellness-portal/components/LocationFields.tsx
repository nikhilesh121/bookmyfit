'use client';

import { useEffect, useId, useState } from 'react';

const RAW_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
const API = RAW_API.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');

type CountryOption = { code: string; name: string };
type StateOption = { code: string; name: string };
type CityOption = { name: string; stateCode?: string };

export type LocationValue = {
  country?: string;
  state?: string;
  city?: string;
};

type Props = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  requiredCity?: boolean;
  inputClassName?: string;
  inputStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  gridClassName?: string;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/api/v1${path}`);
  if (!res.ok) throw new Error('Location list could not load');
  return res.json();
}

function pickByName<T extends { name: string }>(items: T[], name?: string) {
  const wanted = String(name || '').trim().toLowerCase();
  return items.find((item) => item.name.toLowerCase() === wanted);
}

export default function LocationFields({
  value,
  onChange,
  requiredCity = false,
  inputClassName = 'glass-input w-full',
  inputStyle,
  labelStyle,
  gridClassName = 'grid grid-cols-3 gap-4',
}: Props) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [countryCode, setCountryCode] = useState('IN');
  const [stateCode, setStateCode] = useState('');

  useEffect(() => {
    getJson<CountryOption[]>('/locations/countries?limit=300')
      .then((items) => {
        setCountries(items);
        const selected = pickByName(items, value.country) || items.find((item) => item.code === 'IN') || items[0];
        if (selected) {
          setCountryCode(selected.code);
          if (!value.country) onChange({ ...value, country: selected.name });
        }
      })
      .catch(() => setCountries([{ code: 'IN', name: 'India' }]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!countryCode) return;
    getJson<StateOption[]>(`/locations/states?countryCode=${encodeURIComponent(countryCode)}&limit=500`)
      .then((items) => {
        setStates(items);
        const selected = pickByName(items, value.state);
        setStateCode(selected?.code || '');
      })
      .catch(() => {
        setStates([]);
        setStateCode('');
      });
  }, [countryCode, value.state]);

  useEffect(() => {
    if (!countryCode) return;
    const query = stateCode
      ? `/locations/cities?countryCode=${encodeURIComponent(countryCode)}&stateCode=${encodeURIComponent(stateCode)}&limit=800`
      : `/locations/cities?countryCode=${encodeURIComponent(countryCode)}&limit=800`;
    getJson<CityOption[]>(query).then(setCities).catch(() => setCities([]));
  }, [countryCode, stateCode]);

  const datalistId = useId();

  const label = (text: string) => (
    <label className="text-xs font-semibold block mb-1" style={labelStyle || { color: 'var(--t2)' }}>
      {text}
    </label>
  );

  return (
    <div className={gridClassName}>
      <div>
        {label('Country')}
        <select
          className={inputClassName}
          style={inputStyle}
          value={countryCode}
          onChange={(e) => {
            const country = countries.find((item) => item.code === e.target.value);
            setCountryCode(e.target.value);
            setStateCode('');
            onChange({ country: country?.name || '', state: '', city: value.city || '' });
          }}
        >
          {countries.map((country) => (
            <option key={country.code} value={country.code} style={{ background: '#111' }}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        {label('State')}
        <select
          className={inputClassName}
          style={inputStyle}
          value={stateCode}
          onChange={(e) => {
            const state = states.find((item) => item.code === e.target.value);
            setStateCode(e.target.value);
            onChange({ ...value, country: countries.find((item) => item.code === countryCode)?.name || value.country || 'India', state: state?.name || '', city: value.city || '' });
          }}
        >
          <option value="" style={{ background: '#111' }}>Select state</option>
          {states.map((state) => (
            <option key={state.code} value={state.code} style={{ background: '#111' }}>
              {state.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        {label(`City${requiredCity ? ' *' : ''}`)}
        <input
          className={inputClassName}
          style={inputStyle}
          value={value.city || ''}
          list={datalistId}
          required={requiredCity}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          placeholder="Type or select city"
        />
        <datalist id={datalistId}>
          {cities.map((city, index) => (
            <option key={`${city.name}-${city.stateCode || ''}-${index}`} value={city.name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
