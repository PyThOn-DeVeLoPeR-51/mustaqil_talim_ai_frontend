import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentHomePage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Talaba paneli</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Bu yerda siz ustoz bergan topshiriqlarni ko‘rasiz, chizma yuklaysiz va AI tahlil natijasini olasiz.</p>
          <Button asChild>
            <Link href="/student/tasks">Topshiriqlarga o‘tish</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
