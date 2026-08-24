"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function AdminProjectDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}`);
    }
  }, [projectId, router]);

  return null;
}
