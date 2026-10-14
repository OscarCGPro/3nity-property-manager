import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { apiFetcher } from '../../utils/fetch';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import Page from '../../components/Page';
import { StoreContext } from '../../store';
import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { withAuthentication } from '../../components/Authentication';

const usd = (cents) =>
  cents == null
    ? 'Not reconciled'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(cents / 100);
const dateLabel = (value) =>
  value
    ? new Date(value + 'T12:00:00Z').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      })
    : 'Pending signed document';
function Fact({ label, value }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-1 break-words">{value}</dd>
    </div>
  );
}
function Portfolio() {
  const store = useContext(StoreContext);
  const router = useRouter();
  const organizationId = store.organization.selected?._id;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['portfolio', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => (await apiFetcher().get('/portfolio')).data
  });
  const assets = data?.assets || [];
  const rentals = assets.filter((a) => a.category === 'rental');
  const notes = data?.notes || [];
  const cases = data?.reconciliation_cases || [];
  return (
    <Page loading={isLoading} dataCy="portfolioPage">
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground">
            Properties, seller-finance notes, and items needing reconciliation.
          </p>
        </header>
        {isError ? (
          <div role="alert">
            Unable to load the portfolio.{' '}
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : null}
        {data?.state === 'empty' ? (
          <p>No reviewed portfolio has been imported.</p>
        ) : null}
        {data?.state === 'importing' ? (
          <p role="status">The import is being completed. Refresh shortly.</p>
        ) : null}
        {data?.state === 'ready' ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Rental properties', rentals.length],
                ['Active notes', notes.length],
                ['Reconciliation cases', cases.length]
              ].map(([label, count]) => (
                <Card key={label}>
                  <CardContent className="pt-5">
                    <div className="text-sm text-muted-foreground">{label}</div>
                    <div className="text-3xl mt-2 font-semibold">{count}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <section className="space-y-4" aria-labelledby="rentals-heading">
              <h2 id="rentals-heading" className="text-xl font-semibold">
                Rental properties
              </h2>
              <div className="grid gap-4 lg:grid-cols-3">
                {rentals.map((a) => (
                  <Card key={a.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{a.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {a.address.city}, {a.address.state} {a.address.zipCode}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Badge variant="secondary">
                        {a.occupancy === 'occupied'
                          ? 'Occupied'
                          : 'Vacant · being marketed'}
                      </Badge>
                      <dl className="space-y-3">
                        <Fact
                          label="Current tenant"
                          value={
                            a.occupancy === 'occupied'
                              ? 'Lease details pending'
                              : 'None — vacant'
                          }
                        />
                        <Fact
                          label={
                            a.occupancy === 'occupied'
                              ? 'Monthly rent'
                              : 'Asking rent'
                          }
                          value="Not set"
                        />
                      </dl>
                      {a.rental_property_id ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            router.push(
                              `/${store.organization.selected.name}/properties/${a.rental_property_id}`
                            )
                          }
                        >
                          Open property
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
            <section className="space-y-4" aria-labelledby="notes-heading">
              <h2 id="notes-heading" className="text-xl font-semibold">
                Seller-finance notes
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {notes.map((n) => {
                  const collateral = assets.find(
                    (a) => a.id === n.collateral_id
                  );
                  return (
                    <Card key={n.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {collateral?.name || 'Collateral record pending'}
                        </CardTitle>
                        <p>{n.borrower_name}</p>
                        <div>
                          <Badge variant="secondary">
                            Active · balance not reconciled
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <dl className="grid grid-cols-2 gap-5">
                          <Fact
                            label="Original principal"
                            value={usd(n.original_principal_cents)}
                          />
                          <Fact
                            label="Contractual monthly payment"
                            value={usd(n.monthly_payment_cents)}
                          />
                          <Fact
                            label="Annual interest rate"
                            value={`${Number(n.annual_rate) * 100}%`}
                          />
                          <Fact
                            label="First payment due"
                            value={dateLabel(n.first_due_date)}
                          />
                          <Fact
                            label="Outstanding principal"
                            value={usd(n.outstanding_principal_cents)}
                          />
                          <Fact label="Paid through" value="Not reconciled" />
                        </dl>
                        <p className="text-sm text-muted-foreground">
                          Signed copy and payment reconciliation are pending.
                          Fees and notices are inactive.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Unverified document dates:{' '}
                          {n.source_first_due_candidate
                            ? `first payment ${dateLabel(n.source_first_due_candidate)}; `
                            : ''}
                          maturity {dateLabel(n.source_maturity_candidate)}.
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
            <section
              className="space-y-4"
              aria-labelledby="reconciliation-heading"
            >
              <h2 id="reconciliation-heading" className="text-xl font-semibold">
                Reconciliation
              </h2>
              {cases.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {c.title || 'Loan reconciliation'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      Borrower, principal, terms, and receipts need verification
                      against the source documents.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </section>
            <footer className="text-sm text-muted-foreground space-y-2">
              <p>
                Historical note and lease references are retained separately.{' '}
                {data.held?.length || 0} record held for verification;{' '}
                {data.excluded?.length || 0} excluded from this import.
              </p>
              <p>
                Unknown balances remain unreconciled. No charges, payments, or
                notices were generated by this import.
              </p>
            </footer>
          </>
        ) : null}
      </div>
    </Page>
  );
}
export default withAuthentication(Portfolio);
