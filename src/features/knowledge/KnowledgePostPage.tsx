/**
 * Post detail. Comments (with post-author highlighting, "You" labeling, and
 * clickable links) exist for SHARING posts — that's the point of Sharing.
 * Must-acknowledge exists for KNOWLEDGE posts.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, errorDetail } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import type { PostDetail } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ErrorText, Linkified } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

export function KnowledgePostPage() {
  const { id } = useParams();
  const { claims } = useAuth();
  const qc = useQueryClient();
  const post = useQuery({
    queryKey: ["knowledge", "post", id],
    queryFn: async () => (await api.get<PostDetail>(`/knowledge/posts/${id}`)).data,
  });
  const [acked, setAcked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const acknowledge = useMutation({
    mutationFn: () => api.post(`/knowledge/posts/${id}/acknowledge`),
    onSuccess: () => { setAcked(true); qc.invalidateQueries({ queryKey: ["knowledge"] }); },
    onError: (e) => setError(errorDetail(e)),
  });
  const addComment = useMutation({
    mutationFn: (comment: string) => api.post(`/knowledge/posts/${id}/comment`, { comment }),
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["knowledge", "post", id] });
    },
    onError: (e) => setError(errorDetail(e)),
  });

  const myId = claims ? Number(claims.sub) : null;

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3">
        <Link to="/portal/knowledge"><ArrowLeft className="h-4 w-4" /> Knowledge & Sharing</Link>
      </Button>
      <QueryBoundary query={post}>
        {(data) => {
          const isSharing = data.post_type === "sharing";
          return (
            <div className="space-y-3">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2">
                    <Badge variant={isSharing ? "secondary" : "warning"}>{isSharing ? "sharing" : "knowledge"}</Badge>
                    {data.category && !isSharing && <Badge variant="outline">{data.category.replace("_", " ")}</Badge>}
                  </div>
                  <h2 className="mt-2 font-display text-xl font-semibold">{data.title}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                    <Linkified text={data.body ?? ""} />
                  </p>
                </CardContent>
              </Card>

              {isSharing && (
                <Card>
                  <CardContent className="p-5">
                    <p className="mb-2 text-sm font-semibold">Comments ({data.comments.length})</p>
                    {data.comments.length === 0 && (
                      <p className="mb-2 text-[13px] text-muted-foreground">No comments yet — be the first to reply.</p>
                    )}
                    {data.comments.map((comment) => {
                      const isPostAuthor = comment.author_id === data.author_id;
                      const isMine = myId === comment.author_id;
                      return (
                        <div
                          key={comment.id}
                          className={`mb-2 rounded-lg border p-3 ${
                            isPostAuthor ? "border-copper bg-latte/40" : "border-line bg-cream/60"
                          }`}
                        >
                          <p className="text-[13px]"><Linkified text={comment.comment} /></p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground">
                              {isMine ? "You" : comment.author_name ?? "Someone"} ·{" "}
                              {new Date(comment.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
                            </span>
                            {isPostAuthor && <Badge variant="secondary" className="text-[10px]">author</Badge>}
                          </div>
                        </div>
                      );
                    })}
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment or suggestion…"
                      className="mt-2"
                    />
                    {error && <ErrorText>{error}</ErrorText>}
                    <Button
                      className="mt-2"
                      disabled={!commentText.trim() || addComment.isPending}
                      onClick={() => addComment.mutate(commentText.trim())}
                    >
                      Post comment
                    </Button>
                  </CardContent>
                </Card>
              )}

              {data.must_acknowledge && (
                <Card>
                  <CardContent className="p-5">
                    {acked || data.acknowledged_by_me ? (
                      <Badge variant="success">acknowledged ✓</Badge>
                    ) : (
                      <>
                        <p className="mb-2 text-[13px] text-muted-foreground">
                          This is a must-read. Confirm once you've read it — your company sees who has.
                        </p>
                        {error && <ErrorText>{error}</ErrorText>}
                        <Button disabled={acknowledge.isPending} onClick={() => acknowledge.mutate()}>
                          I've read this
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
