import { getSessionUser } from "@/lib/auth/session";
import { getOrdersByUserId, getUserAddresses } from "@/lib/auth/user-store";
import { AuthForms } from "@/components/auth/AuthForms";
import { CustomerDashboard } from "@/components/account/CustomerDashboard";

interface AccountPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const user = await getSessionUser();
  const resolvedParams = await searchParams;

  if (user) {
    const orders = await getOrdersByUserId(user.id);
    const addresses = await getUserAddresses(user.id);

    return (
      <CustomerDashboard
        user={user}
        orders={orders}
        addresses={addresses}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-10 max-w-md mx-auto">
        <h1 className="text-2xl font-light tracking-tight uppercase text-neutral-950">
          Client Identification
        </h1>
        <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
          Sign in to access your bespoke wardrobe, track ongoing commissions,
          and manage delivery destinations.
        </p>
      </div>

      <AuthForms
        initialMode="login"
        redirectTo={resolvedParams.redirect || "/account"}
      />
    </div>
  );
}
