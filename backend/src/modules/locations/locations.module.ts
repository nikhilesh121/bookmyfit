import { Controller, Get, Module, Query } from '@nestjs/common';
import { City, Country, State } from 'country-state-city';

type LimitOptions = {
  q?: string;
  limit?: string | number;
};

function normalizeText(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function applySearchAndLimit<T extends Record<string, any>>(items: T[], options: LimitOptions, keys: string[]) {
  const query = normalizeText(options.q);
  const limit = Math.min(Math.max(Number(options.limit) || 250, 1), 5000);
  const filtered = query
    ? items.filter((item) => keys.some((key) => normalizeText(item[key]).includes(query)))
    : items;
  return filtered.slice(0, limit);
}

@Controller('locations')
class LocationsController {
  @Get('countries')
  countries(@Query('q') q?: string, @Query('limit') limit?: string) {
    const countries = Country.getAllCountries().map((country) => ({
      code: country.isoCode,
      name: country.name,
      phoneCode: country.phonecode,
      flag: country.flag,
      latitude: country.latitude,
      longitude: country.longitude,
    }));
    return applySearchAndLimit(countries, { q, limit }, ['name', 'code', 'phoneCode']);
  }

  @Get('states')
  states(@Query('countryCode') countryCode = 'IN', @Query('q') q?: string, @Query('limit') limit?: string) {
    const states = State.getStatesOfCountry(String(countryCode || 'IN').toUpperCase()).map((state) => ({
      code: state.isoCode,
      name: state.name,
      countryCode: state.countryCode,
      latitude: state.latitude,
      longitude: state.longitude,
    }));
    return applySearchAndLimit(states, { q, limit }, ['name', 'code']);
  }

  @Get('cities')
  cities(
    @Query('countryCode') countryCode = 'IN',
    @Query('stateCode') stateCode?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const normalizedCountry = String(countryCode || 'IN').toUpperCase();
    const states = stateCode
      ? State.getStatesOfCountry(normalizedCountry).filter((state) => state.isoCode === String(stateCode).toUpperCase())
      : State.getStatesOfCountry(normalizedCountry);
    const cities = states.flatMap((state) =>
      City.getCitiesOfState(normalizedCountry, state.isoCode).map((city) => ({
        name: city.name,
        stateCode: state.isoCode,
        stateName: state.name,
        countryCode: normalizedCountry,
        countryName: Country.getCountryByCode(normalizedCountry)?.name || normalizedCountry,
        latitude: city.latitude,
        longitude: city.longitude,
      })),
    );
    return applySearchAndLimit(cities, { q, limit }, ['name', 'stateName', 'countryName']);
  }
}

@Module({
  controllers: [LocationsController],
})
export class LocationsModule {}
