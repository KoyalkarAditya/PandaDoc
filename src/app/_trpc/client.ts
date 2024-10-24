import { AppRouter } from "@/trpc";
import { createTRPCReact, CreateTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>({});
