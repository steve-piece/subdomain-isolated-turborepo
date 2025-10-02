// apps/protected/components/projects/create-project-dialog.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@actions/projects";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { useToast } from "@workspace/ui/components/toast";
import { FolderPlus } from "lucide-react";

interface CreateProjectDialogProps {
  subdomain: string;
  trigger?: React.ReactNode;
}

export function CreateProjectDialog({
  subdomain,
  trigger,
}: CreateProjectDialogProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await createProject(name, description || null, subdomain);

      if (result.success && result.projectId) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        setName("");
        setDescription("");
        setOpen(false);
        router.push(`/projects/${result.projectId}`);
        router.refresh();
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a project to organize your work and invite team members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Project"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                maxLength={100}
                autoComplete="off"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What is this project about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Project"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
