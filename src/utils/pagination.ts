export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function buildPageMeta(total: number, page: number, limit: number): PageMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export function skipFor(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * "-createdAt" biçimindeki sıralama ifadesini Mongoose sort nesnesine çevirir.
 * Başındaki "-" azalan sıra demektir.
 */
export function parseSort(expression: string): Record<string, 1 | -1> {
  if (expression.startsWith('-')) {
    return { [expression.slice(1)]: -1 };
  }
  return { [expression]: 1 };
}
