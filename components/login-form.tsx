"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlertIcon } from "lucide-react";
import Image from "next/image";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { syncAdminSessionCookie } from "@/lib/adminSessionCookie";

// เปลี่ยนจาก 'export function LoginForm' เป็น 'export const LoginForm'
// และใช้ Arrow Function Syntax
export const LoginForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    await syncAdminSessionCookie(
      data.session?.access_token ?? null,
      data.session?.expires_at
    );

    router.replace("/admin/dashboard");
  };
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center flex flex-col items-center gap-2">
          <div className="flex size-[80px] items-center justify-center overflow-hidden rounded-full border border-solid border-gray-alpha-400 bg-[hsla(0,0%,9%,1)]">
            {/* ตรวจสอบว่า `sdo_logo.png` มีพื้นหลังโปร่งใสหรือไม่
                ถ้าโลโก้เป็นสีขาวบนพื้นหลังโปร่งใส อาจจะดูดีกว่าบนพื้นหลังสีนี้ */}
            <Image src="/sdo_logo.png" alt="SDO Logo" width={80} height={80} />
          </div>
          <CardTitle className="text-2xl font-bold">
            Sign in to <span className="text-primary">sd0</span> Admin
          </CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@work-email.com"
                  autoComplete="email"
                  required
                  className="h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
                <Input
                  className="h-12"
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field>
                {error && (
                  <Alert className="bg-destructive/10 text-destructive border-none">
                    <TriangleAlertIcon />
                    <AlertTitle>Login failed</AlertTitle>
                    <AlertDescription className="text-destructive/80">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
