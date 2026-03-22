"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DeletePostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
};

export function DeletePostDialog({ open, onOpenChange, onConfirm, busy }: DeletePostDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => busy && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Delete this post?</DialogTitle>
          <DialogDescription className="text-app-fg-muted">
            This will remove the post, its likes, and comments. You can&apos;t undo this.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onConfirm()}
            className="rounded-full border-red-500/40 text-red-400 hover:border-red-400/50 hover:bg-red-500/15 hover:text-red-300"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete post"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
