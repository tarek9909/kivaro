function isPresent(value) {
  return value !== undefined && value !== null && value !== '';
}

export function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (!isPresent(value)) {
      return;
    }

    if (Array.isArray(value)) {
      value.filter(isPresent).forEach((item) => searchParams.append(key, item));
      return;
    }

    searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function withQuery(path, params) {
  return `${path}${buildQuery(params)}`;
}
