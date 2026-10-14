const ALLOWED =
  /^\/(properties|tenants|leases|rents\/\d{4}\/\d{1,2}|dashboard|portfolio)$/;
export class RentalReader {
  constructor({
    baseUrl,
    clientId,
    clientSecret,
    organizationId,
    fetchImpl = fetch
  }) {
    const url = new URL(baseUrl);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('Invalid server URL');
    }
    if (!clientId || !clientSecret || !organizationId)
      throw new Error('Missing MCP configuration');
    this.baseUrl = url.origin;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.organizationId = organizationId;
    this.fetch = fetchImpl;
  }
  async json(response) {
    if (!response.ok)
      throw new Error(`Rental API returned status ${response.status}`);
    const reader = response.body.getReader();
    let size = 0;
    const chunks = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 512_000)
          throw new Error('API response exceeds MCP size limit');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  async authenticate() {
    const response = await this.fetch(
      `${this.baseUrl}/api/v2/authenticator/landlord/signin`,
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: this.clientId,
          clientSecret: this.clientSecret
        })
      }
    );
    const data = await this.json(response);
    if (
      data.organizationId !== this.organizationId ||
      typeof data.accessToken !== 'string'
    ) {
      throw new Error('MCP organization binding failed');
    }
    this.token = data.accessToken;
    this.expires = Date.now() + 270_000;
  }
  async get(path) {
    if (!ALLOWED.test(path)) throw new Error('Path is not an MCP read tool');
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!this.token || Date.now() >= this.expires) await this.authenticate();
      const response = await this.fetch(`${this.baseUrl}/api/v2${path}`, {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${this.token}`,
          organizationid: this.organizationId
        }
      });
      if (response.status === 401 && attempt === 0) {
        this.token = undefined;
        await response.body?.cancel();
        continue;
      }
      return this.json(response);
    }
  }
}
