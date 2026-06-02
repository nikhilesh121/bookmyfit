import { api } from './api';

export function normalizePaginated<T = any>(payload: any): { data: T[]; total: number; pages: number; page: number; limit: number } {
  const data = Array.isArray(payload) ? payload : payload?.data || [];
  return {
    data,
    total: Number(payload?.total ?? data.length),
    pages: Number(payload?.pages ?? 1),
    page: Number(payload?.page ?? 1),
    limit: Number(payload?.limit ?? (data.length || 100)),
  };
}

export async function fetchAllCorporateEmployees(corporateId: string) {
  const first = normalizePaginated(await api.get(`/corporate/${corporateId}/employees?page=1&limit=100`));
  if (first.pages <= 1) return first;

  const rest = await Promise.all(
    Array.from({ length: first.pages - 1 }, (_, index) =>
      api.get(`/corporate/${corporateId}/employees?page=${index + 2}&limit=100`).then(normalizePaginated)
    )
  );

  const data = [first, ...rest].flatMap((page) => page.data);
  return { ...first, data, total: first.total, pages: first.pages };
}

export async function loadCorporateWithEmployees() {
  const corporate = await api.get('/corporate/me');
  if (!corporate) return { corporate: null, employees: [], total: 0 };
  const id = corporate._id || corporate.id;
  const employees = await fetchAllCorporateEmployees(id);
  return { corporate, employees: employees.data, total: employees.total };
}

export async function fetchAllCorporateCheckins() {
  const first = normalizePaginated(await api.get('/corporate/me/checkins?page=1&limit=100'));
  if (first.pages <= 1) return first;

  const rest = await Promise.all(
    Array.from({ length: first.pages - 1 }, (_, index) =>
      api.get(`/corporate/me/checkins?page=${index + 2}&limit=100`).then(normalizePaginated)
    )
  );

  const data = [first, ...rest].flatMap((page) => page.data);
  return { ...first, data, total: first.total, pages: first.pages };
}
