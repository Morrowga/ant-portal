/** Create post with the type selector. Knowledge-type posting depends on the
 *  company setting (a 403 is surfaced plainly); Sharing is open to everyone. */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { api, errorDetail } from "@/lib/api-client";
import type { PostType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Chip, ErrorText } from "@/components/shared/bits";

export function KnowledgeNewPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [postType, setPostType] = useState<PostType>(params.get("post_type") === "sharing" ? "sharing" : "knowledge");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.post("/knowledge/posts", {
        title: title.trim(),
        body: body.trim(),
        post_type: postType,
        ...(postType === "knowledge" ? { category: "general" } : {}),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["knowledge"] }); navigate("/ants-office/knowledge"); },
    onError: (e) => setError(errorDetail(e)),
  });

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3">
        <Link to="/ants-office/knowledge"><ArrowLeft className="h-4 w-4" /> {t("features.knowledgeNew.knowledgeAndSharing")}</Link>
      </Button>
      <h1 className="text-xl font-semibold">{t("features.knowledgeNew.newPost")}</h1>
      <Card className="mt-4">
        <CardContent className="p-5">
          <Label className="mb-1.5 block">{t("features.knowledgeNew.type")}</Label>
          <div className="mb-1 flex gap-2">
            <Chip label={t("features.knowledge.tabs.knowledge")} selected={postType === "knowledge"} onClick={() => setPostType("knowledge")} />
            <Chip label={t("features.knowledge.tabs.sharing")} selected={postType === "sharing"} onClick={() => setPostType("sharing")} />
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {postType === "knowledge"
              ? t("features.knowledgeNew.knowledgeHint")
              : t("features.knowledgeNew.sharingHint")}
          </p>
          <Label htmlFor="post-title" className="mb-1.5 block">{t("features.knowledgeNew.titleLabel")}</Label>
          <Input id="post-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("features.knowledgeNew.titlePlaceholder")} />
          <Label htmlFor="post-body" className="mb-1.5 mt-3 block">{t("features.knowledgeNew.bodyLabel")}</Label>
          <Textarea
            id="post-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={t("features.knowledgeNew.bodyPlaceholder")}
          />
          {error && <ErrorText>{error}</ErrorText>}
          <Button
            className="mt-3"
            disabled={title.trim().length < 3 || body.trim().length < 10 || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? t("features.knowledgeNew.publishing") : t("features.knowledgeNew.publish")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}