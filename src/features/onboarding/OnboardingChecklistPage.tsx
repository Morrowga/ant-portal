import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

interface ChecklistItem {
  id: number; title: string; type: "task" | "read" | "watch";
  linked_knowledge_post_id?: number | null; required: boolean; order?: number; completed?: boolean;
}

export function OnboardingChecklistPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const qc = useQueryClient();

  const checklist = useQuery({
    queryKey: ["onboarding", "me"],
    queryFn: async () => (await api.get<ChecklistItem[]>("/onboarding/me")).data,
  });
  const complete = useMutation({
    mutationFn: (id: number) => api.post(`/onboarding/me/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding", "me"] }),
  });
  const finishMutation = useMutation({
    mutationFn: () => api.post("/me/onboarding-complete"),
    onSuccess: async () => {
      await refreshMe();
      navigate("/portal");
    },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-xl font-semibold">{t("features.onboardingChecklist.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("features.onboardingChecklist.subtitle")}</p>

      <QueryBoundary query={checklist}>
        {(items) => (
          <div className="mt-4 space-y-2">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("features.onboardingChecklist.empty")}</p>
            )}
            {items.map((item) => (
              <Card
                key={item.id}
                className={item.completed ? "opacity-70" : "cursor-pointer transition-colors hover:bg-muted/40"}
                onClick={() => !item.completed && complete.mutate(item.id)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className={`text-sm font-medium ${item.completed ? "text-muted-foreground line-through" : ""}`}>
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">{item.type}</p>
                  </div>
                  <Badge variant={item.completed ? "success" : item.required ? "warning" : "outline"}>
                    {item.completed
                      ? t("features.onboardingChecklist.done")
                      : item.required
                      ? t("features.onboardingChecklist.required")
                      : t("features.onboardingChecklist.optional")}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>

      <Button className="mt-6 w-full" disabled={finishMutation.isPending} onClick={() => finishMutation.mutate()}>
        {finishMutation.isPending ? t("features.onboardingChecklist.finishing") : t("features.onboardingChecklist.takeMeToApp")}
      </Button>
    </div>
  );
}