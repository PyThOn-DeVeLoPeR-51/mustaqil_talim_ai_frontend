"use client";

import { loginTeacher } from "@/api/auth";

export default function TestApiPage() {
  async function testLogin() {
    try {
      const res = await loginTeacher({
        email: "teacher@example.com",
        password: "123456",
      });

      console.log("LOGIN NATIJA:", res);
      alert("Login ishladi. Console ni tekshiring.");
    } catch (error) {
      console.error("LOGIN XATO:", error);
      alert("Xatolik bor. Console ni tekshiring.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <button
        onClick={testLogin}
        className="rounded-lg bg-black px-5 py-3 text-white"
      >
        Backend login test
      </button>
    </main>
  );
}