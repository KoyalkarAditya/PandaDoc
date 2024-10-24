"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../_trpc/client";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const Page = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origin = searchParams.get("origin");

  const { data, isLoading, isSuccess, isError } = trpc.authCallback.useQuery();
  useEffect(() => {
    if (isSuccess) {
      router.push(origin ? `/${origin}` : "/dashboard");
    }
    if (isError) {
      router.push("/sign-in");
    }
  }, [isSuccess, isError, origin]);
  return (
    <div className="w-full mt-24 flex justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-800" />
        <div className="font-semibold text-xl">Setting up your account...</div>
        <p>You will be redirected automatically</p>
      </div>
    </div>
  );
};

export default Page;
