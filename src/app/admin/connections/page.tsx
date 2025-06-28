import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ConnectionsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Connections</h1>
      <Card>
        <CardHeader>
          <CardTitle>Connection Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Configure your connections here. This is a placeholder.</p>
        </CardContent>
      </Card>
    </>
  );
}
