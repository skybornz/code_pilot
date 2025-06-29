import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ModelSettingsPage() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary">Model Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Adjust model settings here. This is a placeholder.</p>
        </CardContent>
      </Card>
    </>
  );
}
