import { UserDetailsDashboard } from './user-details-dashboard';

export default function UserDetailsPage({ params }: { params: { userId: string } }) {
  return <UserDetailsDashboard userId={params.userId} />;
}
