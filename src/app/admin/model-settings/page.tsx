import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ModelSettingsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Model Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Adjust model settings here. This is a placeholder.</p>
        </CardContent>
      </Card>
    </>
  );
}
