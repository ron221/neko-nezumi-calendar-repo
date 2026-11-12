import type { Metadata } from "next";
import { LoginScreen } from "./login-screen";

export const metadata: Metadata = { title: "登入・貓鼠日曆" };

export default function LoginPage() {
  return <LoginScreen />;
}
