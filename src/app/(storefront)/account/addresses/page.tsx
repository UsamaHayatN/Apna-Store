import { getSessionUser } from "@/lib/auth/session";
import { getUserAddresses } from "@/lib/auth/user-store";
import { AddressesClient } from "@/components/account/AddressesClient";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await getSessionUser();

  if (!user) {
    return <AddressesClient addresses={[]} isGuest={true} />;
  }

  const addresses = await getUserAddresses(user.id);

  return <AddressesClient addresses={addresses} isGuest={false} />;
}
