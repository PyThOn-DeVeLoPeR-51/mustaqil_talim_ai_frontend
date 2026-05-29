import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck, UserRoundCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col gap-10">
          <header className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Mustaqil ta’lim • GOST/ESCD • AI-tahlil
            </p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Mustaqil ta’lim AI platformasi
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              O‘qituvchi talabalarni biriktiradi, topshiriq beradi, talabalar chizma yuklaydi.
              Platforma esa AI yordamida overlay, jadval va 100 ballik baholash natijasini qaytaradi.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/login">
                  Tizimga kirish
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">O‘qituvchi yoki talaba login</Link>
              </Button>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="space-y-2">
                <UserRoundCog className="h-8 w-8 text-muted-foreground" />
                <CardTitle>O‘qituvchi kabineti</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Talaba qo‘shish, login/parol generatsiya qilish, topshiriq yaratish va AI natijalarini ko‘rish.
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-2">
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
                <CardTitle>Talaba kabineti</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Talaba faqat ustoz bergan login-parol bilan kiradi, topshiriqni ko‘radi va 2 martagacha chizma yuklaydi.
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-2">
                <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                <CardTitle>2 rejim va 100 ball</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Etalon va ixtiyoriy rejimlar AI orqali baholanadi, overlay va jadval natija sifatida saqlanadi.
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
