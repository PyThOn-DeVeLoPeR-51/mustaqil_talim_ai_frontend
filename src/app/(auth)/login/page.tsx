"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { loginStudent, loginTeacher } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type LoginMode = "teacher" | "student";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<LoginMode>("teacher");
  const [teacherEmail, setTeacherEmail] = useState("teacher@example.com");
  const [teacherPassword, setTeacherPassword] = useState("123456");
  const [studentLogin, setStudentLogin] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleTeacherLogin() {
    try {
      setLoading(true);
      setError("");

      await loginTeacher({
        email: teacherEmail,
        password: teacherPassword,
      });

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("O‘qituvchi email yoki paroli noto‘g‘ri.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStudentLogin() {
    try {
      setLoading(true);
      setError("");

      await loginStudent({
        login: studentLogin,
        password: studentPassword,
      });

      router.push("/student/tasks");
    } catch (err) {
      console.error(err);
      setError("Talaba login yoki paroli noto‘g‘ri.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Kirish</CardTitle>
          <CardDescription>
            O‘qituvchi email/parol bilan kiradi. Talaba esa ustoz bergan login/parol bilan kiradi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(value) => setMode(value as LoginMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teacher">O‘qituvchi</TabsTrigger>
              <TabsTrigger value="student">Talaba</TabsTrigger>
            </TabsList>

            <TabsContent value="teacher" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  type="email"
                  placeholder="teacher@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Parol</Label>
                <Input
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  type="password"
                  placeholder="********"
                />
              </div>

              <Button className="w-full" disabled={loading} onClick={handleTeacherLogin}>
                {loading ? "Kirilmoqda..." : "O‘qituvchi sifatida kirish"}
              </Button>
            </TabsContent>

            <TabsContent value="student" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Login</Label>
                <Input
                  value={studentLogin}
                  onChange={(e) => setStudentLogin(e.target.value)}
                  placeholder="Masalan: student_a1b2c3d4"
                />
              </div>

              <div className="space-y-2">
                <Label>Parol</Label>
                <Input
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  type="password"
                  placeholder="********"
                />
              </div>

              <Button className="w-full" disabled={loading} onClick={handleStudentLogin}>
                {loading ? "Kirilmoqda..." : "Talaba sifatida kirish"}
              </Button>
            </TabsContent>
          </Tabs>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
