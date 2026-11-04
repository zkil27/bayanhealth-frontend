import { AuthBox } from "@/features/authentication/components/AuthBox";

export default function ForgotPasswordPage() {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-end sm:justify-center">
      <AuthBox type="forgot password" />
    </div>
  );
}
