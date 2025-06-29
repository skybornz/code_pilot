import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function UsageStatisticsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Usage Statistics</h1>
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Usage statistics will be displayed here. This is a placeholder.</p>
        </CardContent>
      </Card>
    </>
  );
}
