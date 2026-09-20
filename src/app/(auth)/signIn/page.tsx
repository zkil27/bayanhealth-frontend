import { SignIn } from "@/features/authentication/components/SignIn";

export default function Page() {
  return (
    <div className="flex w-full flex-1 flex-col justify-end sm:justify-center items-center">
        <SignIn />
    </div>
  );
}
