export function paginate(page: any = 1, limit: any = 20) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}
