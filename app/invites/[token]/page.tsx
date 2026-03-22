import InviteAcceptClient from '../../../components/public/InviteAcceptClient';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  return <InviteAcceptClient token={token} />;
}
