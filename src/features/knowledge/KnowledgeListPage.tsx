import { useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/lib/api-client";
import type { KnowledgePost, PostType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyText } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

export function KnowledgeListPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<PostType>("knowledge");
  const [search, setSearch] = useState("");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("features.knowledge.pageTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "knowledge"
              ? t("features.knowledge.knowledgeDescription")
              : t("features.knowledge.sharingDescription")}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to={`/portal/knowledge/new?post_type=${tab}`}>{t("features.knowledge.newPost")}</Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as PostType)} className="mt-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="knowledge">{t("features.knowledge.tabs.knowledge")}</TabsTrigger>
          <TabsTrigger value="sharing">{t("features.knowledge.tabs.sharing")}</TabsTrigger>
        </TabsList>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("features.knowledge.searchPlaceholder")}
          className="mt-3 max-w-sm"
        />
        <TabsContent value="knowledge"><PostList type="knowledge" search={search} /></TabsContent>
        <TabsContent value="sharing"><PostList type="sharing" search={search} /></TabsContent>
      </Tabs>
    </div>
  );
}

function PostList({ type, search }: { type: PostType; search: string }) {
  const { t } = useTranslation();
  const posts = useQuery({
    queryKey: ["knowledge", type, search],
    queryFn: async () =>
      (await api.get<KnowledgePost[]>("/knowledge/posts", {
        params: { post_type: type, ...(search ? { search } : {}) },
      })).data,
  });

  return (
    <QueryBoundary query={posts}>
      {(rows) => {
        const sorted = type === "knowledge" ? [...rows].sort((a, b) => Number(b.pinned) - Number(a.pinned)) : rows;
        return (
          <div className="space-y-2">
            {sorted.length === 0 && (
              <EmptyText>{type === "knowledge" ? t("features.knowledge.noPostsFound") : t("features.knowledge.noSharingPostsYet")}</EmptyText>
            )}
            {sorted.map((post) => (
              <Link key={post.id} to={`/portal/knowledge/${post.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold">
                        {post.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-copper" />}
                        <span className="truncate">{post.title}</span>
                      </p>
                      {post.must_acknowledge && <Badge variant="warning">{t("features.knowledge.mustRead")}</Badge>}
                    </div>
                    {post.category && type === "knowledge" && (
                      <p className="mt-1 text-xs capitalize text-muted-foreground">{post.category.replace("_", " ")}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        );
      }}
    </QueryBoundary>
  );
}