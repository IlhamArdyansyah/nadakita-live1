// NADAKITA's small browser-native Supabase REST adapter.
// Auth: GoTrue; tables/RPC: PostgREST; images: Storage API.
// No third-party CDN is needed to render or submit the sign-in form.
// All access restrictions are enforced by Supabase Auth/RLS on the server.
/**
 * Adapter fetch kecil dengan kontrak {data,error} yang dipakai seluruh halaman.
 * Mengelola refresh sesi, query builder PostgREST, RPC, dan Storage.
 * Publishable key bukan izin admin; otorisasi selalu ditentukan Auth/RLS/server.
 */
export function createNativeClient(projectUrl, publishableKey) {
  const base = projectUrl.replace(/\/$/, '');
  const ref = new URL(base).hostname.split('.')[0];
  const storageKey = `sb-${ref}-auth-token`; // Compatible with supabase-js session storage.
  let session = null;
  let refreshInFlight = null;
  try {
    session = JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch {
    session = null;
  }

  const asError = (data, status) => {
    const error = new Error(
      data?.msg ||
        data?.error_description ||
        data?.message ||
        data?.error ||
        `Request failed (${status})`
    );
    error.status = status;
    error.code = data?.code || data?.error_code || '';
    return error;
  };
  function remember(value) {
    session =
      value && value.access_token
        ? {
            ...value,
            expires_at:
              value.expires_at || Math.floor(Date.now() / 1000) + (value.expires_in || 3600),
          }
        : null;
    try {
      if (session) localStorage.setItem(storageKey, JSON.stringify(session));
      else localStorage.removeItem(storageKey);
    } catch {
      /* Session persists only until this tab is closed when storage is unavailable. */
    }
    return session;
  }
  async function refreshSession() {
    if (!session?.refresh_token) return null;
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const response = await fetch(`${base}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          remember(null);
          throw asError(body, response.status);
        }
        return remember(body);
      })().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }
  async function accessToken() {
    if (!session?.access_token) return null;
    if (session.expires_at && session.expires_at <= Date.now() / 1000 + 30) {
      await refreshSession();
    }
    return session?.access_token || null;
  }
  function credentialsHeaders(token) {
    const h = { apikey: publishableKey };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }
  async function request(
    path,
    { method = 'GET', body, headers = {}, auth = true, asBlob = false } = {}
  ) {
    const token = auth ? await accessToken() : null;
    const h = { ...credentialsHeaders(token), ...headers };
    if (body !== undefined && !asBlob && !('Content-Type' in h))
      h['Content-Type'] = 'application/json';
    const response = await fetch(`${base}${path}`, {
      method,
      headers: h,
      body: body === undefined ? undefined : asBlob ? body : JSON.stringify(body),
    });
    const raw = response.status === 204 ? '' : await response.text();
    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }
    if (!response.ok)
      return {
        data: null,
        error: asError(parsed, response.status),
        status: response.status,
        count: null,
      };
    const contentRange = response.headers.get('content-range') || '';
    const count = /\/(\d+)$/.exec(contentRange)?.[1];
    return {
      data: parsed,
      error: null,
      status: response.status,
      count: count ? Number(count) : null,
    };
  }
  async function authCall(path, method = 'POST', body, { authorization = false } = {}) {
    return request(`/auth/v1${path}`, { method, body, auth: authorization });
  }
  const auth = {
    async signInWithPassword({ email, password }) {
      const result = await authCall('/token?grant_type=password', 'POST', { email, password });
      if (!result.error) remember(result.data);
      return result;
    },
    async signUp({ email, password, options = {} }) {
      const redirect = options.emailRedirectTo
        ? `?redirect_to=${encodeURIComponent(options.emailRedirectTo)}`
        : '';
      const result = await authCall(`/signup${redirect}`, 'POST', {
        email,
        password,
        data: options.data || {},
      });
      if (!result.error) {
        if (result.data?.access_token) remember(result.data);
        result.data = {
          user: result.data?.user || result.data,
          session: result.data?.access_token ? session : null,
        };
      }
      return result;
    },
    async signInAnonymously({ options = {} } = {}) {
      const result = await authCall('/signup', 'POST', { data: options.data || {} });
      if (!result.error) remember(result.data);
      return result;
    },
    async getUser() {
      try {
        const token = await accessToken();
        if (!token) return { data: { user: null }, error: null };
        const result = await authCall('/user', 'GET', undefined, { authorization: true });
        if (result.error?.status === 401) remember(null);
        return { data: { user: result.data?.user || result.data || null }, error: result.error };
      } catch (error) {
        return { data: { user: null }, error };
      }
    },
    async getSession() {
      try {
        await accessToken();
        return { data: { session }, error: null };
      } catch (error) {
        return { data: { session: null }, error };
      }
    },
    async signOut() {
      try {
        if (session?.access_token) await authCall('/logout', 'POST', {}, { authorization: true });
      } finally {
        remember(null);
      }
      return { error: null };
    },
    async resetPasswordForEmail(email, { redirectTo } = {}) {
      const qs = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : '';
      return authCall(`/recover${qs}`, 'POST', { email });
    },
    async updateUser(attributes) {
      return authCall('/user', 'PUT', attributes, { authorization: true });
    },
  };
  // Password recovery links include tokens in the URL fragment. Consume without
  // leaking them in links or browser history, matching supabase-js basic behavior.
  try {
    if (typeof location !== 'undefined' && location.hash.includes('access_token=')) {
      const parts = new URLSearchParams(location.hash.slice(1));
      if (parts.get('access_token') && parts.get('refresh_token')) {
        remember({
          access_token: parts.get('access_token'),
          refresh_token: parts.get('refresh_token'),
          expires_in: Number(parts.get('expires_in') || '3600'),
          token_type: parts.get('token_type') || 'bearer',
        });
        history.replaceState(null, '', location.pathname + location.search);
      }
    }
  } catch {
    /* Auth form can still show an actionable error if a recovery link is malformed. */
  }

  class TableQuery {
    constructor(table) {
      this.table = table;
      this.method = 'GET';
      this.params = new URLSearchParams();
      this.headers = {};
      this.payload = undefined;
      this.wantSingle = false;
      this.optionalSingle = false;
      this.includeCount = false;
    }
    select(columns = '*', options = {}) {
      this.params.set('select', columns);
      if (options.count === 'exact') this.includeCount = true;
      if (this.method !== 'GET') this.headers.Prefer = 'return=representation';
      return this;
    }
    insert(data) {
      this.method = 'POST';
      this.payload = data;
      return this;
    }
    update(data) {
      this.method = 'PATCH';
      this.payload = data;
      return this;
    }
    upsert(data) {
      this.method = 'POST';
      this.payload = data;
      this.headers.Prefer = 'resolution=merge-duplicates,return=minimal';
      return this;
    }
    delete() {
      this.method = 'DELETE';
      return this;
    }
    filter(column, operator, value) {
      this.params.append(column, `${operator}.${value}`);
      return this;
    }
    eq(c, v) {
      return this.filter(c, 'eq', v);
    }
    neq(c, v) {
      return this.filter(c, 'neq', v);
    }
    gt(c, v) {
      return this.filter(c, 'gt', v);
    }
    gte(c, v) {
      return this.filter(c, 'gte', v);
    }
    lt(c, v) {
      return this.filter(c, 'lt', v);
    }
    lte(c, v) {
      return this.filter(c, 'lte', v);
    }
    ilike(c, v) {
      return this.filter(c, 'ilike', v);
    }
    or(value) {
      this.params.set('or', `(${value})`);
      return this;
    }
    order(column, { ascending = true } = {}) {
      this.params.append('order', `${column}.${ascending ? 'asc' : 'desc'}`);
      return this;
    }
    limit(n) {
      this.params.set('limit', String(n));
      return this;
    }
    range(from, to) {
      this.params.set('offset', String(from));
      this.params.set('limit', String(to - from + 1));
      return this;
    }
    single() {
      this.wantSingle = true;
      return this;
    }
    maybeSingle() {
      this.wantSingle = true;
      this.optionalSingle = true;
      return this;
    }
    async execute() {
      if (this.wantSingle) this.headers.Accept = 'application/vnd.pgrst.object+json';
      if (this.includeCount)
        this.headers.Prefer = [this.headers.Prefer, 'count=exact'].filter(Boolean).join(',');
      if (this.method !== 'GET' && !this.headers.Prefer) this.headers.Prefer = 'return=minimal';
      const qs = this.params.toString();
      const result = await request(
        `/rest/v1/${encodeURIComponent(this.table)}${qs ? '?' + qs : ''}`,
        {
          method: this.method,
          body: this.payload,
          headers: this.headers,
        }
      );
      if (this.optionalSingle && result.error?.status === 406)
        return { ...result, data: null, error: null };
      return result;
    }
    then(resolve, reject) {
      return this.execute().then(resolve, reject);
    }
  }
  const storage = {
    from(bucket) {
      return {
        async upload(path, file, options = {}) {
          return request(
            `/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`,
            {
              method: 'POST',
              body: file,
              asBlob: true,
              headers: {
                'Content-Type': options.contentType || file.type || 'application/octet-stream',
                ...(options.upsert ? { 'x-upsert': 'true' } : {}),
              },
            }
          );
        },
        getPublicUrl(path) {
          return {
            data: {
              publicUrl: `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`,
            },
          };
        },
      };
    },
  };
  return {
    auth,
    from(table) {
      return new TableQuery(table);
    },
    rpc(name, params = {}) {
      return request(`/rest/v1/rpc/${encodeURIComponent(name)}`, { method: 'POST', body: params });
    },
    storage,
  };
}
